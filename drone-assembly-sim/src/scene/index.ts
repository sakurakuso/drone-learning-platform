import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { AssemblyState, PartDefinition, SceneAdapter, SceneAdapterFactory, SceneAdapterOptions, SceneUserOperation, Transform, ViewPreset } from '../contracts';
import { applyTransform, createPartGeometry, disposeObject, highlightPart, readTransform } from './geometry';

interface PartVisual { definition: PartDefinition; signature: string; object: THREE.Group; ghost: THREE.Group }
interface Gesture { id: string; pointerId?: number; start: Transform; point?: THREE.Vector3; plane?: THREE.Plane; moved: boolean }
export interface WorkbenchSceneAdapter extends SceneAdapter {
  /** Presentation only. Nonzero values lock manipulation even if shared exploded=false. */
  setExplosionAmount(amount: number): void;
  setIsolation(enabled: boolean): void;
  setHideOuter(enabled: boolean): void;
  setTargetPreview(enabled: boolean): void;
  setLanguage(language: 'en' | 'zh'): void;
  setCameraNavigationMode(mode: 'orbit' | 'pan'): void;
  /** Optional camera preview; authoritative viewPreset changes still take priority. */
  setViewPreset(preset: ViewPreset): void;
  getDiagnostics(): ReturnType<Workbench['getDiagnostics']>;
}

class Workbench implements WorkbenchSceneAdapter {
  private readonly options: SceneAdapterOptions;
  private state: AssemblyState;
  private definitions: readonly PartDefinition[];
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.05, 500);
  private renderer?: THREE.WebGLRenderer;
  private orbit?: OrbitControls;
  private transform?: TransformControls;
  private readonly parts = new Map<string, PartVisual>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly events = new AbortController();
  private readonly cleanups: (() => void)[] = [];
  private observer?: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private failed = false;
  private contextLost = false;
  private gesture?: Gesture;
  private selected: string | null;
  private explosionAmount = 0;
  private isolated = false;
  private hideOuter = false;
  private targetPreview = true;
  private frames = 0;
  private sampleStart = performance.now();
  private rendererName = 'WebGL';
  private lastMetrics = { fps: 0, frameTimeMs: 0, renderer: 'WebGL', drawCalls: 0 };
  private readonly root = document.createElement('div');
  private readonly alert = document.createElement('div');
  private readonly explosionInput = document.createElement('input');
  private readonly hint = document.createElement('div');
  private size = { width: 0, height: 0 };
  private language: 'en' | 'zh' = 'en';
  private labels: { element: HTMLElement; en: string; zh: string }[] = [];

  constructor(options: SceneAdapterOptions) {
    this.options = options;
    this.state = options.state;
    this.definitions = options.definitions;
    this.selected = options.state.selectedPartId;
    this.language = options.language ?? 'en';
    this.explosionAmount = options.state.exploded ? 1 : 0;
    this.root.dataset.sceneWorkbench = '';
    this.root.style.cssText = 'position:relative;width:100%;height:100%;min-height:240px;overflow:hidden;background:#e6edf4';
    options.container.append(this.root);
    this.alert.setAttribute('role', 'alert');
    this.alert.style.cssText = 'position:absolute;inset:15px 15px auto;padding:12px;border-radius:8px;background:#fff1ef;color:#9c2828;z-index:5;display:none';
    this.root.append(this.alert);
    try { this.initialize(); } catch (error) {
      this.fail(`${this.language === 'en' ? '3D workbench failed to load: ' : '3D 工作台加载失败：'}${error instanceof Error ? error.message : String(error)}`);
      this.releaseResources();
    }
  }

  private initialize() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    this.renderer.domElement.setAttribute('aria-label', '无人机 3D 装配工作台');
    this.renderer.domElement.tabIndex = 0;
    this.root.prepend(this.renderer.domElement);
    this.scene.background = new THREE.Color('#e6edf4');
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#8895a5', 2.2));
    const light = new THREE.DirectionalLight('#ffffff', 3);
    light.position.set(5, 14, 7);
    this.scene.add(light);
    const fill = new THREE.DirectionalLight('#c0deff', 1.1);
    fill.position.set(-8, 8, -9);
    this.scene.add(fill);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#d7e1eb', roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    this.scene.add(ground);
    const grid = new THREE.GridHelper(40, 40, '#90a9be', '#bdccd9');
    grid.position.y = -0.04;
    this.scene.add(grid);
    // Register capture handlers before controls; camera must not start moving on a part.
    const canvas = this.renderer.domElement;
    this.listen(canvas, 'pointerdown', this.pointerDown as EventListener, true);
    this.listen(canvas, 'pointermove', this.pointerMove as EventListener, true);
    this.listen(canvas, 'pointerup', this.pointerUp as EventListener, true);
    this.listen(canvas, 'pointercancel', this.cancelGesture as EventListener, true);
    this.listen(canvas, 'lostpointercapture', this.lostCapture as EventListener);
    this.listen(window, 'blur', this.cancelGesture as EventListener);
    this.listen(canvas, 'keydown', ((e: KeyboardEvent) => { if (e.key === 'Escape') this.cancelGesture(); }) as EventListener);
    this.listen(canvas, 'webglcontextlost', ((e: Event) => {
      e.preventDefault(); this.contextLost = true; this.cancelGesture();
      cancelAnimationFrame(this.frame);
      this.showError(this.language === 'en' ? 'WebGL context lost. Waiting for browser recovery.' : 'WebGL 上下文丢失，等待浏览器恢复。');
    }) as EventListener);
    this.listen(canvas, 'webglcontextrestored', (() => {
      if (this.disposed || this.failed) return;
      this.contextLost = false; this.alert.style.display = 'none';
      this.sampleStart = performance.now(); this.frames = 0; this.animate();
    }) as EventListener);
    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.12;
    this.orbit.minDistance = 1;
    this.orbit.maxDistance = 180;
    this.transform = new TransformControls(this.camera, canvas);
    this.transform.setSize(0.8);
    this.scene.add(this.transform.getHelper());
    this.transform.addEventListener('mouseDown', this.gizmoStart);
    this.transform.addEventListener('objectChange', this.gizmoChange);
    this.transform.addEventListener('mouseUp', this.gizmoEnd);
    this.cleanups.push(() => {
      this.transform?.removeEventListener('mouseDown', this.gizmoStart);
      this.transform?.removeEventListener('objectChange', this.gizmoChange);
      this.transform?.removeEventListener('mouseUp', this.gizmoEnd);
    });
    const gl = this.renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    this.rendererName = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    if (this.options.showBuiltinControls !== false) this.addToolbar();
    this.reconcileDefinitions(this.definitions);
    this.applyState();
    this.setLanguage(this.language);
    this.observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (box) this.resize(box.width, box.height);
    });
    this.observer.observe(this.root);
    this.resize(this.root.clientWidth, this.root.clientHeight);
    this.setViewPreset(this.state.viewPreset);
    this.animate();
  }

  private listen(target: EventTarget, type: string, handler: EventListener, capture = false) {
    target.addEventListener(type, handler, { capture, signal: this.events.signal });
  }

  private addToolbar() {
    const bar = document.createElement('div');
    bar.dataset.sceneToolbar = '';
    bar.style.cssText = 'position:absolute;left:10px;bottom:10px;right:10px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px;border-radius:10px;background:#fffffff0;color:#233649;font:12px system-ui;box-shadow:0 2px 12px #18334c22;z-index:2';
    const button = (zh: string, en: string, action: () => void) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = en;
      this.labels.push({ element: b, en, zh });
      b.style.cssText = 'border:1px solid #b8cad8;border-radius:6px;background:#fff;color:#233649;padding:5px 9px;cursor:pointer';
      this.listen(b, 'click', action); bar.append(b); return b;
    };
    button('整体', 'Overall', () => this.setViewPreset('perspective'));
    button('俯视', 'Top', () => this.setViewPreset('top'));
    button('侧视', 'Side', () => this.setViewPreset('side'));
    const toggle = (zh: string, en: string, setter: (value: boolean) => void) => {
      let value = false;
      const b = button(zh, en, () => { value = !value; b.setAttribute('aria-pressed', String(value)); setter(value); });
      b.setAttribute('aria-pressed', 'false');
    };
    toggle('隔离选择', 'Isolate selection', value => this.setIsolation(value));
    toggle('隐藏保护架', 'Hide guards', value => this.setHideOuter(value));
    toggle('隐藏目标预览', 'Hide target', value => this.setTargetPreview(!value));
    toggle('平移镜头', 'Pan camera', value => this.setCameraNavigationMode(value ? 'pan' : 'orbit'));
    const label = document.createElement('label');
    const caption = document.createElement('span'); caption.textContent = 'Explode ';
    this.labels.push({ element: caption, en: 'Explode ', zh: '爆炸图 ' }); label.append(caption);
    this.explosionInput.type = 'range'; this.explosionInput.min = '0'; this.explosionInput.max = '1'; this.explosionInput.step = '0.01';
    this.explosionInput.setAttribute('aria-label', 'Explosion amount / 爆炸图程度'); this.explosionInput.style.width = '90px';
    label.append(this.explosionInput); bar.append(label);
    this.listen(this.explosionInput, 'input', () => this.setExplosionAmount(Number(this.explosionInput.value)));
    button('还原展示', 'Restore display', () => this.setExplosionAmount(0));
    this.hint.setAttribute('aria-live', 'polite');
    this.hint.style.cssText = 'position:absolute;top:10px;left:10px;right:10px;pointer-events:none;color:#324c63;background:#ffffffe0;border-radius:7px;padding:6px 9px;font:12px system-ui';
    this.root.append(this.hint, bar);
  }

  private reconcileDefinitions(definitions: readonly PartDefinition[]) {
    const ids = new Set<string>();
    for (const definition of definitions) {
      if (ids.has(definition.id)) throw new Error(`重复零件编号：${definition.id}`);
      ids.add(definition.id);
      const signature = JSON.stringify(definition.geometry);
      const current = this.parts.get(definition.id);
      if (current?.signature === signature) { current.definition = definition; continue; }
      if (current) { disposeObject(current.object); disposeObject(current.ghost); }
      const object = createPartGeometry(definition);
      const ghost = createPartGeometry(definition, true);
      this.parts.set(definition.id, { definition, signature, object, ghost });
      this.scene.add(object, ghost);
    }
    for (const [id, visual] of this.parts) {
      if (!ids.has(id)) { disposeObject(visual.object); disposeObject(visual.ghost); this.parts.delete(id); }
    }
  }

  update(state: AssemblyState, definitions: readonly PartDefinition[]) {
    if (this.disposed || this.failed) return;
    try {
      // External updates cancel an in-flight gesture: never commit a stale transform.
      if (this.gesture) this.cancelGesture();
      const viewChanged = state.viewPreset !== this.state.viewPreset;
      const explodedChanged = state.exploded !== this.state.exploded;
      this.state = state; this.definitions = definitions; this.selected = state.selectedPartId;
      if (explodedChanged) this.explosionAmount = state.exploded ? 1 : 0;
      this.reconcileDefinitions(definitions); this.applyState();
      if (viewChanged) this.setViewPreset(state.viewPreset);
    } catch (error) { this.fail(`${this.language === 'en' ? 'Scene state failed to load: ' : '场景状态加载失败：'}${error instanceof Error ? error.message : String(error)}`); }
  }

  private applyState() {
    for (const [id, visual] of this.parts) {
      const part = this.state.parts[id];
      if (!part) throw new Error(`缺少共享零件状态：${id}`);
      applyTransform(visual.object, part.transform);
      visual.object.position.addScaledVector(new THREE.Vector3(...visual.definition.explosionOffset), this.explosionAmount);
      visual.object.visible = (!this.isolated || !this.selected || id === this.selected) && (!this.hideOuter || visual.definition.category !== 'guard');
      highlightPart(visual.object, id === this.selected);
      applyTransform(visual.ghost, visual.definition.targetTransform);
      visual.ghost.visible = this.targetPreview && id === this.selected && !part.installed && visual.object.visible && this.explosionAmount === 0 && !this.state.exploded;
    }
    this.explosionInput.value = String(this.explosionAmount);
    this.attachControls();
    const locked = this.explosionAmount > 0 || this.state.exploded;
    this.hint.textContent = this.language === 'zh'
      ? locked ? '爆炸展示中 · 零件操作已锁定' : this.state.parts[this.selected ?? '']?.installed ? '已安装零件锁定 · 可检查视角' : this.state.interactionMode === 'rotate' ? '拖动旋转环调整朝向 · 空白处旋转镜头，滚轮缩放，右键平移' : '点击选择 · 拖动零件自由移动，轴控件精确移动 · 空白处旋转镜头，滚轮缩放，右键平移'
      : locked ? 'Exploded display · manipulation locked' : this.state.parts[this.selected ?? '']?.installed ? 'Installed part locked · inspect with camera controls' : this.state.interactionMode === 'rotate' ? 'Drag rotation rings · orbit on empty space, scroll to zoom, right drag to pan' : 'Click to select · drag a part freely or use axes · orbit on empty space, scroll to zoom, right drag to pan';
  }

  private attachControls() {
    const object = this.selected ? this.parts.get(this.selected)?.object : undefined;
    this.transform?.detach();
    if (object?.visible && this.selected && !this.state.parts[this.selected]?.installed && this.explosionAmount === 0 && !this.state.exploded) {
      this.transform?.setMode(this.state.interactionMode);
      this.transform?.attach(object);
      if (this.transform) this.transform.enabled = true;
    } else if (this.transform) this.transform.enabled = false;
  }

  private pointerCoordinates(event: PointerEvent) {
    const rect = this.renderer!.domElement.getBoundingClientRect();
    return new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  }

  private pointerDown = (event: PointerEvent) => {
    if (this.disposed || this.failed || this.contextLost || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || this.gesture) return;
    const point = this.pointerCoordinates(event);
    this.scene.updateMatrixWorld(true);
    if (this.transform?.enabled) {
      // three's implementation consumes normalized x/y; its type declares PointerEvent.
      this.transform.pointerHover(new PointerEvent('pointermove', { button: event.button, clientX: point.x, clientY: point.y }));
      if (this.transform.axis) { if (this.orbit) this.orbit.enabled = false; return; }
    }
    this.raycaster.setFromCamera(point, this.camera);
    const hit = this.raycaster.intersectObjects([...this.parts.values()].filter(v => v.object.visible).map(v => v.object), true).find(h => h.object instanceof THREE.Mesh);
    const id = hit?.object.userData.partId as string | undefined;
    if (!id) { this.select(null); return; }
    // Stop OrbitControls and TransformControls from processing the same pointer.
    event.stopImmediatePropagation(); event.preventDefault();
    this.select(id);
    if (this.state.parts[id]?.installed || this.explosionAmount > 0 || this.state.exploded || this.state.interactionMode === 'rotate') return;
    const object = this.parts.get(id)!.object;
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(new THREE.Vector3()), object.position);
    const startPoint = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!startPoint) return;
    this.orbit!.enabled = false;
    this.gesture = { id, pointerId: event.pointerId, start: readTransform(object), plane, point: startPoint, moved: false };
    this.renderer!.domElement.setPointerCapture(event.pointerId);
  };

  private select(id: string | null) {
    if (id === this.selected) return;
    this.selected = id; this.applyState();
    this.emit({ type: 'SELECT_PART', partId: id });
  }

  private pointerMove = (event: PointerEvent) => {
    const gesture = this.gesture;
    if (gesture?.pointerId !== event.pointerId || !gesture.plane || !gesture.point) return;
    event.stopImmediatePropagation(); event.preventDefault();
    this.raycaster.setFromCamera(this.pointerCoordinates(event), this.camera);
    const point = this.raycaster.ray.intersectPlane(gesture.plane, new THREE.Vector3());
    if (!point) return;
    const delta = point.sub(gesture.point);
    gesture.moved = delta.lengthSq() > 1e-8;
    this.parts.get(gesture.id)!.object.position.fromArray(gesture.start.position).add(delta);
  };

  private pointerUp = (event: PointerEvent) => {
    if (!this.gesture && this.orbit) this.orbit.enabled = true;
    if (this.gesture?.pointerId !== event.pointerId) return;
    event.stopImmediatePropagation();
    this.finishGesture();
  };

  private gizmoStart = () => {
    if (!this.selected || !this.transform?.object) return;
    this.gesture = { id: this.selected, start: readTransform(this.transform.object), moved: false };
    this.orbit!.enabled = false;
  };
  private gizmoChange = () => { if (this.gesture) this.gesture.moved = true; };
  private gizmoEnd = () => this.finishGesture();
  private lostCapture = () => { if (this.gesture) this.cancelGesture(); };

  private finishGesture() {
    const gesture = this.gesture;
    if (!gesture) { if (this.orbit) this.orbit.enabled = true; return; }
    const desired = readTransform(this.parts.get(gesture.id)!.object);
    const changed = JSON.stringify(desired) !== JSON.stringify(gesture.start);
    this.gesture = undefined;
    this.releasePointer(gesture.pointerId);
    if (this.orbit) this.orbit.enabled = true;
    this.applyState(); // The rules' next update is the only accepted persistent position.
    if (gesture.moved && changed) this.emit({ type: 'SET_TRANSFORM', partId: gesture.id, transform: desired });
  }

  private cancelGesture = () => {
    const gesture = this.gesture; this.gesture = undefined;
    if (this.transform?.dragging) {
      this.transform.reset();
      this.transform.pointerUp(new PointerEvent('pointerup', { button: 0 }));
    }
    if (gesture) this.releasePointer(gesture.pointerId);
    if (this.orbit) this.orbit.enabled = true;
    if (gesture && !this.disposed && !this.failed) this.applyState();
  };

  private releasePointer(id?: number) {
    const canvas = this.renderer?.domElement;
    if (id !== undefined && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }

  private emit(operation: SceneUserOperation) {
    try { this.options.onOperation(operation); } catch (error) { this.showError(`${this.language === 'en' ? 'Operation callback failed: ' : '操作回调失败：'}${String(error)}`); }
  }

  setExplosionAmount(amount: number) {
    if (this.disposed || this.failed) return;
    this.cancelGesture();
    this.explosionAmount = THREE.MathUtils.clamp(Number.isFinite(amount) ? amount : 0, 0, 1);
    this.applyState();
  }
  setIsolation(enabled: boolean) { if (this.disposed || this.failed) return; this.cancelGesture(); this.isolated = enabled; this.applyState(); }
  setHideOuter(enabled: boolean) { if (this.disposed || this.failed) return; this.cancelGesture(); this.hideOuter = enabled; this.applyState(); }
  setTargetPreview(enabled: boolean) { if (this.disposed || this.failed) return; this.targetPreview = enabled; this.applyState(); }
  setLanguage(language: 'en' | 'zh') {
    if (this.disposed || this.failed) return;
    this.language = language;
    this.labels.forEach(label => { label.element.textContent = label[language]; });
    this.applyState();
  }
  setCameraNavigationMode(mode: 'orbit' | 'pan') {
    if (this.disposed || this.failed || !this.orbit) return;
    this.cancelGesture();
    this.orbit.mouseButtons.LEFT = mode === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    this.orbit.touches.ONE = mode === 'pan' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
  }

  setViewPreset(preset: ViewPreset) {
    if (this.disposed || this.failed || !this.orbit) return;
    this.cancelGesture();
    const bounds = new THREE.Box3();
    // Include targets so an unassembled workbench shows where the drone will be built.
    this.parts.forEach(v => { if (v.object.visible) bounds.expandByObject(v.object); bounds.expandByObject(v.ghost); });
    if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 4, 5));
    const center = bounds.getCenter(new THREE.Vector3());
    const extent = bounds.getSize(new THREE.Vector3()).length();
    const distance = Math.max(5, extent * 0.65 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / Math.min(this.camera.aspect, 1));
    const direction = preset === 'top' ? new THREE.Vector3(0, 1, 0.0001) : preset === 'side' ? new THREE.Vector3(1, 0.1, 0) : preset === 'front' ? new THREE.Vector3(0, 0.1, -1) : new THREE.Vector3(0.85, 0.85, 1);
    this.camera.position.copy(center).addScaledVector(direction.normalize(), distance);
    this.orbit.target.copy(center); this.orbit.update();
  }

  resize(width: number, height: number) {
    if (this.disposed || this.failed || !this.renderer || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    this.size = { width, height };
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
  }

  private animate = () => {
    if (this.disposed || this.failed || this.contextLost) return;
    try {
      if (!this.gesture) this.orbit?.update();
      this.renderer!.render(this.scene, this.camera);
      this.frames++;
      const now = performance.now(), elapsed = now - this.sampleStart;
      if (elapsed >= 1000) {
        this.lastMetrics = { fps: this.frames * 1000 / elapsed, frameTimeMs: elapsed / this.frames, renderer: this.rendererName, drawCalls: this.renderer!.info.render.calls };
        this.frames = 0; this.sampleStart = now;
        this.options.onMetrics?.(this.lastMetrics);
      }
      this.frame = requestAnimationFrame(this.animate);
    } catch (error) { this.fail(`${this.language === 'en' ? '3D rendering failed: ' : '3D 渲染失败：'}${error instanceof Error ? error.message : String(error)}`); }
  };

  private showError(message: string) {
    this.alert.textContent = message; this.alert.style.display = 'block';
    try { this.options.onError?.(message); } catch { /* Error reporting must not crash cleanup. */ }
  }
  private fail(message: string) { this.cancelGesture(); this.failed = true; cancelAnimationFrame(this.frame); this.showError(message); }

  getDiagnostics() {
    const objects: Record<string, { position: number[]; rotation: number[]; visible: boolean; ghostVisible: boolean; screen: { x: number; y: number } }> = {};
    this.parts.forEach((v, id) => {
      const screen = v.object.position.clone().project(this.camera);
      objects[id] = { position: v.object.position.toArray(), rotation: v.object.quaternion.toArray(), visible: v.object.visible, ghostVisible: v.ghost.visible, screen: { x: (screen.x + 1) / 2 * this.size.width, y: (1 - screen.y) / 2 * this.size.height } };
    });
    return { disposed: this.disposed, failed: this.failed, contextLost: this.contextLost, cameraEnabled: this.orbit?.enabled ?? false, manipulating: Boolean(this.gesture), explosionAmount: this.explosionAmount, size: { ...this.size }, cameraPosition: this.camera.position.toArray(), cameraTarget: this.orbit?.target.toArray(), metrics: { ...this.lastMetrics }, objects, resources: this.renderer ? { ...this.renderer.info.memory } : null };
  }

  private releaseResources() {
    cancelAnimationFrame(this.frame); this.observer?.disconnect(); this.events.abort();
    this.cleanups.splice(0).forEach(cleanup => cleanup());
    this.transform?.dispose(); this.transform?.getHelper().removeFromParent();
    // Three 0.180 removes its normal listeners in dispose, but a held Control key
    // can leave the temporary root keyup listener. Remove that known implementation hook.
    const pendingControlUp = (this.orbit as unknown as { _interceptControlUp?: EventListener } | undefined)?._interceptControlUp;
    if (pendingControlUp) this.renderer?.domElement.getRootNode().removeEventListener('keyup', pendingControlUp, true);
    this.orbit?.dispose();
    // TransformControls owns its helper resources; remove it before our traversal.
    disposeObject(this.scene); this.scene.clear(); this.parts.clear();
    this.renderer?.dispose(); this.renderer?.forceContextLoss(); this.renderer?.domElement.remove();
  }

  dispose() {
    if (this.disposed) return;
    this.cancelGesture(); this.disposed = true; this.releaseResources(); this.root.remove();
  }
}

export const createSceneAdapter: SceneAdapterFactory = options => new Workbench(options);
/** Same factory with typed optional presentation controls for integrations that need them. */
export const createWorkbenchSceneAdapter = (options: SceneAdapterOptions): WorkbenchSceneAdapter => new Workbench(options);
