import * as THREE from 'three';
import type { AssemblyState, PartDefinition, TeachingStep, Transform } from '../contracts';
import { applyTransform, disposeObject } from './geometry';
import { guideTargets, magneticPlacementGuide as placementGuide } from './guidance';
import { SNAP_RADIUS } from '../assembly/snapping';
import type { PlacementStatus } from './guidance';

const colors = { invalid: '#ba293b', blocked: '#ae6507', move: '#1471c8', rotate: '#1471c8', scale: '#1471c8', ready: '#168145', installed: '#168145', inspection: '#60798b' };
export const placementColor = (status: PlacementStatus) => colors[status];
const words: Record<PlacementStatus, [string, string]> = {
  blocked: ['🔒 Prerequisites missing', '🔒 前置零件未安装'], move: ['↗ Move to target', '↗ 移到安装位'], rotate: ['↻ Adjust orientation', '↻ 调整朝向'],
  scale: ['↔ Check scale', '↔ 检查缩放'], ready: ['🧲 Release to snap & install', '🧲 松手吸附并安装'], installed: ['✓ Snapped & installed', '✓ 已吸附安装'], inspection: ['Inspection only', '仅观察'],
  invalid: ['⚠ Invalid transform', '⚠ 变换数据无效'],
};
interface Marker {
  definition: PartDefinition; signature: string; root: THREE.Group; outline: THREE.LineSegments; ring: THREE.Mesh;
  cross: THREE.LineSegments; check: THREE.Line; button: HTMLButtonElement; name: HTMLElement; status: HTMLElement;
  leader: SVGLineElement; shown: boolean; selected: boolean; events: AbortController;
}
interface Rect { x: number; y: number; w: number; h: number }
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w + 5 && a.x + a.w + 5 > b.x && a.y < b.y + b.h + 5 && a.y + a.h + 5 > b.y;


/** Pooled 3D/DOM teaching cues. All anchors derive from shared targetTransform. */
export class TargetPresentation {
  private readonly root = new THREE.Group();
  private readonly layer = document.createElement('div');
  private readonly labelLayer = document.createElement('div');
  private readonly svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  private readonly card = document.createElement('div');
  private readonly legend = document.createElement('div');
  private readonly markers = new Map<string, Marker>();
  private readonly events = new AbortController();
  private readonly pathGeometry = new THREE.BufferGeometry();
  private readonly pathPosition = new THREE.BufferAttribute(new Float32Array(6), 3);
  private readonly pathDistance = new THREE.BufferAttribute(new Float32Array(2), 1);
  private readonly path = new THREE.Line(this.pathGeometry, new THREE.LineDashedMaterial({ color: '#1471c8', dashSize: 0.13, gapSize: 0.09, depthTest: false, transparent: true, opacity: 0.8 }));
  private direction = new THREE.Group();
  private directionSignature = '';
  private directionLabels: { element: HTMLElement; point: THREE.Vector3; en: string; zh: string }[] = [];
  private state?: AssemblyState;
  private selected: string | null = null;
  private language: 'en' | 'zh' = 'en';
  private hidden = false;
  private dirty = true;
  private projectionKey = '';
  private disposed = false;
  private displayedIds: string[] = [];
  private docked = false;

  constructor(scene: THREE.Scene, host: HTMLElement, private readonly select: (id: string) => void) {
    this.root.name = 'shared-installation-targets'; scene.add(this.root);
    this.root.add(this.path, this.direction);
    this.pathGeometry.setAttribute('position', this.pathPosition);
    this.pathGeometry.setAttribute('lineDistance', this.pathDistance);
    this.path.frustumCulled = false; this.path.renderOrder = 40; this.path.visible = false;
    this.layer.dataset.targetPresentation = '';
    this.layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden;font:12px system-ui;color:#18384f';
    this.labelLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    this.svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    this.card.dataset.placementReadout = '';
    this.card.style.cssText = 'position:absolute;left:10px;bottom:50px;max-width:calc(100% - 30px);padding:8px 11px;background:#fffffff0;border:1px solid #b8d4e7;border-radius:9px;font-size:12px;line-height:1.5;box-shadow:0 2px 8px #18334c18;pointer-events:none;white-space:pre-line';
    this.legend.style.cssText = 'position:absolute;top:50px;left:10px;padding:5px 8px;border-radius:7px;background:#fffffff0;color:#25516f;font-size:11px;pointer-events:none';
    for (const type of ['pointerdown', 'pointerup', 'wheel']) this.labelLayer.addEventListener(type, event => event.stopPropagation(), { signal: this.events.signal });
    this.layer.append(this.svg, this.labelLayer, this.legend, this.card); host.append(this.layer);
  }

  sync(definitions: readonly PartDefinition[], steps: readonly TeachingStep[], state: AssemblyState, selected: string | null, all: boolean, visible: boolean, language: 'en' | 'zh') {
    if (this.disposed) return;
    this.state = state; this.selected = selected; this.language = language; this.hidden = !visible;
    const ids = new Set(definitions.map(d => d.id));
    for (const [id, marker] of this.markers) if (!ids.has(id)) this.remove(marker);
    for (const definition of definitions) {
      const signature = JSON.stringify([definition.geometry.size, definition.targetTransform]);
      let marker = this.markers.get(definition.id);
      if (marker && marker.signature !== signature) { this.remove(marker); marker = undefined; }
      if (!marker) { marker = this.createMarker(definition, signature); this.markers.set(definition.id, marker); }
      marker.definition = definition;
      applyTransform(marker.root, definition.targetTransform);
    }
    const targets = guideTargets(definitions, steps, { ...state, selectedPartId: selected }, all);
    const shown = new Set(targets.map(d => d.id));
    this.displayedIds = targets.map(d => d.id);
    this.markers.forEach(marker => {
      const installed = state.parts[marker.definition.id].installed;
      marker.shown = visible && shown.has(marker.definition.id);
      marker.selected = marker.definition.id === selected;
      marker.root.visible = visible && (marker.shown || installed);
      marker.outline.visible = !installed; marker.cross.visible = !installed; marker.check.visible = installed;
      marker.ring.visible = !installed || marker.selected;
      const checkScale = installed && !marker.selected ? Math.min(1, 0.2 / Math.max(0.11, Math.min(marker.definition.geometry.size[0], marker.definition.geometry.size[2]) * 0.3)) : 1;
      marker.check.scale.set(checkScale, 1, checkScale);
      marker.button.hidden = !marker.shown; marker.button.style.display = marker.shown ? 'block' : 'none'; marker.leader.style.display = marker.shown ? '' : 'none';
      this.updateMarker(marker, placementGuide(marker.definition, state));
    });
    this.updateDirection(definitions);
    this.directionLabels.forEach(label => { label.element.textContent = language === 'zh' ? label.zh : label.en; });
    this.legend.textContent = language === 'zh' ? '机头 FRONT · 蓝色箭头 / 左 LEFT · 右 RIGHT' : 'FRONT → blue arrow · LEFT / RIGHT are aircraft sides';
    this.card.hidden = !visible || !selected;
    this.updateLive(selected ? state.parts[selected]?.transform : undefined);
    this.dirty = true;
  }

  private createMarker(definition: PartDefinition, signature: string): Marker {
    const root = new THREE.Group(); root.name = `mount-${definition.id}`;
    const [w, h, d] = definition.geometry.size;
    const box = new THREE.BoxGeometry(w, h, d);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: '#1471c8', depthTest: false, transparent: true, opacity: 0.65 }));
    box.dispose();
    const r = Math.max(0.11, Math.min(w, d) * 0.3);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.86, r, 32), new THREE.MeshBasicMaterial({ color: '#1471c8', side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.85 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = h / 2 + 0.025;
    const cross = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-r * 0.6, h / 2 + 0.025, 0), new THREE.Vector3(r * 0.6, h / 2 + 0.025, 0),
      new THREE.Vector3(0, h / 2 + 0.025, -r * 0.6), new THREE.Vector3(0, h / 2 + 0.025, r * 0.6),
    ]), new THREE.LineBasicMaterial({ color: '#1471c8', depthTest: false }));
    const check = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-r * 0.5, h / 2 + 0.04, 0), new THREE.Vector3(-r * 0.08, h / 2 + 0.04, r * 0.4), new THREE.Vector3(r * 0.55, h / 2 + 0.04, -r * 0.42),
    ]), new THREE.LineBasicMaterial({ color: '#168145', depthTest: false }));
    root.add(outline, ring, cross, check); root.renderOrder = 30;
    root.children.forEach(o => { o.renderOrder = 30; }); this.root.add(root);
    const button = document.createElement('button'); button.type = 'button'; button.dataset.targetId = definition.id;
    button.style.cssText = 'position:absolute;width:178px;height:46px;box-sizing:border-box;padding:5px 8px;text-align:left;border:1px solid #1471c8;border-radius:8px;background:#fffffff2;color:#1471c8;font:11px system-ui;line-height:17px;pointer-events:auto;cursor:pointer;box-shadow:0 2px 7px #173a4c18;overflow:hidden;touch-action:manipulation';
    const name = document.createElement('strong'); name.style.cssText = 'display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:650';
    const status = document.createElement('span'); status.style.cssText = 'display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px';
    button.append(name, status); this.labelLayer.append(button);
    const leader = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leader.setAttribute('stroke-width', '1'); leader.setAttribute('stroke-dasharray', '3 3'); this.svg.append(leader);
    const stop = (event: Event) => event.stopPropagation();
    const events = new AbortController();
    for (const type of ['pointerdown', 'pointerup', 'pointermove', 'dblclick', 'contextmenu', 'wheel']) button.addEventListener(type, stop, { signal: events.signal });
    button.addEventListener('click', event => { event.stopPropagation(); this.select(definition.id); }, { signal: events.signal });
    return { definition, signature, root, outline, ring, cross, check, button, name, status, leader, shown: false, selected: false, events };
  }

  private updateMarker(marker: Marker, guide: ReturnType<typeof placementGuide>) {
    const color = colors[guide.status];
    [marker.outline.material, marker.ring.material, marker.cross.material].forEach(material => (material as THREE.LineBasicMaterial).color.set(color));
    marker.button.style.borderColor = color; marker.button.style.color = color;
    marker.button.style.borderWidth = marker.selected ? '2px' : '1px';
    marker.button.style.background = marker.selected ? '#edf7ff' : '#fffffff2';
    marker.button.dataset.placementStatus = guide.status;
    marker.button.setAttribute('aria-pressed', String(marker.selected));
    const name = this.language === 'zh' ? marker.definition.name : marker.definition.nameEn;
    const prefix = guide.status === 'installed' ? '✓ ' : marker.selected ? '◉ ' : '⌖ ';
    const missing = guide.missing.map(id => {
      const definition = this.markers.get(id)?.definition;
      return this.language === 'zh' ? definition?.name ?? id : definition?.nameEn ?? id;
    }).join(', ');
    const text = words[guide.status][this.language === 'zh' ? 1 : 0];
    const detail = guide.status === 'blocked' ? `${text}: ${missing}` : text;
    if (marker.name.textContent !== prefix + name) marker.name.textContent = prefix + name;
    if (marker.status.textContent !== detail) marker.status.textContent = detail;
    marker.button.title = `${name} · ${marker.definition.id}\n${detail}`;
    marker.button.setAttribute('aria-label', `${this.language === 'zh' ? '选择安装位' : 'Select mounting target'}: ${name}. ${detail}`);
    marker.leader.setAttribute('stroke', color);
  }

  /** The optional transient transform is presentation-only and is never sent to rules here. */
  updateLive(transform?: Transform) {
    const marker = this.selected ? this.markers.get(this.selected) : undefined;
    if (this.disposed || this.hidden || !this.state || !marker || !transform) { this.path.visible = false; return; }
    const guide = placementGuide(marker.definition, this.state, transform);
    this.updateMarker(marker, guide);
    this.path.visible = !this.state.parts[marker.definition.id].installed;
    const target = marker.definition.targetTransform.position;
    this.pathPosition.setXYZ(0, ...transform.position); this.pathPosition.setXYZ(1, ...target); this.pathPosition.needsUpdate = true;
    this.pathDistance.setX(1, guide.distance); this.pathDistance.needsUpdate = true;
    (this.path.material as THREE.LineDashedMaterial).color.set(colors[guide.status]);
    const zh = this.language === 'zh';
    const heading = `${zh ? marker.definition.name : marker.definition.nameEn} · ${words[guide.status][zh ? 1 : 0]}`;
    const numeric = `${zh ? '距离 / 吸附范围' : 'Distance / capture range'} ${guide.distance.toFixed(3)} / ${SNAP_RADIUS.toFixed(2)} ${zh ? '教学单位 · 朝向自动校正' : 'teaching units · automatic orientation'}`;
    const message = `${heading}\n${numeric}`;
    if (this.card.textContent !== message) this.card.textContent = message;
    this.card.style.borderColor = colors[guide.status];
    return guide;
  }

  private updateDirection(definitions: readonly PartDefinition[]) {
    const datum = definitions.find(d => d.geometry.kind === 'frame');
    if (!datum) { this.direction.visible = false; return; }
    const signature = JSON.stringify([datum.geometry.size, datum.targetTransform]);
    if (signature === this.directionSignature) return;
    disposeObject(this.direction); this.directionLabels.forEach(label => label.element.remove()); this.directionLabels = [];
    this.direction = new THREE.Group(); this.root.add(this.direction); this.directionSignature = signature;
    applyTransform(this.direction, datum.targetTransform);
    const [w, h, d] = datum.geometry.size;
    const y = -h / 2 - 0.08;
    const origin = new THREE.Vector3(0, y, 0);
    const front = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), origin, d * 0.82, 0x1471c8, 0.4, 0.24);
    this.direction.add(front);
    for (const [x, name, zh] of [[-w * 0.74, 'LEFT', '左 LEFT'], [w * 0.74, 'RIGHT', '右 RIGHT']] as const) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin, new THREE.Vector3(x, y, 0)]), new THREE.LineBasicMaterial({ color: '#617e94', depthTest: false }));
      this.direction.add(line); this.addDirectionLabel(new THREE.Vector3(x, y, 0), name, zh);
    }
    this.addDirectionLabel(new THREE.Vector3(0, y, -d * 0.88), 'FRONT ↑', '机头 FRONT ↑');
    front.traverse(o => {
      if (o instanceof THREE.Line || o instanceof THREE.Mesh) { (o.material as THREE.Material).depthTest = false; o.renderOrder = 20; }
    });
  }

  private addDirectionLabel(point: THREE.Vector3, en: string, zh: string) {
    const element = document.createElement('span'); element.dataset.aircraftDirection = en;
    element.style.cssText = 'position:absolute;padding:3px 6px;background:#edf6ffe8;border:1px solid #c1d9ea;border-radius:5px;color:#245c86;font:bold 10px system-ui;pointer-events:none;white-space:nowrap';
    this.layer.append(element); this.directionLabels.push({ element, point, en, zh });
  }

  project(camera: THREE.Camera, width: number, height: number) {
    if (this.disposed || width <= 0 || height <= 0) return;
    const key = `${camera.matrixWorld.elements.join(',')}:${camera.projectionMatrix.elements.join(',')}:${width}:${height}`;
    if (!this.dirty && key === this.projectionKey) return;
    this.dirty = false; this.projectionKey = key;
    const project = (point: THREE.Vector3) => {
      const p = point.project(camera); return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2, visible: p.z >= -1 && p.z <= 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 };
    };
    this.direction.updateWorldMatrix(true, false);
    const reserved: Rect[] = [];
    this.directionLabels.forEach(label => {
      const p = project(this.direction.localToWorld(label.point.clone()));
      label.element.hidden = !p.visible;
      label.element.style.left = `${Math.max(2, Math.min(width - 90, p.x - 25))}px`;
      label.element.style.top = `${Math.max(78, Math.min(height - 130, p.y))}px`;
      if (p.visible) reserved.push({ x: parseFloat(label.element.style.left), y: parseFloat(label.element.style.top), w: label.element.offsetWidth, h: label.element.offsetHeight });
    });
    const markers = [...this.markers.values()].filter(m => m.shown).sort((a, b) => Number(b.selected) - Number(a.selected));
    const labelW = Math.min(178, width - 20), labelH = 46;
    const placed: Rect[] = [...reserved];
    const positions: { marker: Marker; p: ReturnType<typeof project>; rect: Rect }[] = [];
    let needsDock = false;
    for (const marker of markers) {
      const p = project(new THREE.Vector3(...marker.definition.targetTransform.position));
      const clamp = (x: number, y: number): Rect => ({ x: Math.max(8, Math.min(width - labelW - 8, x)), y: Math.max(82, Math.min(height - 155, y)), w: labelW, h: labelH });
      const candidates: Rect[] = [];
      for (const radius of [36, 85, 140, 200, 260, 330]) for (const [x, y] of [[1, -1], [-1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [1, 0], [-1, 0]]) candidates.push(clamp(p.x + x * radius - labelW / 2, p.y + y * radius - labelH / 2));
      for (let y = 82; y <= height - 155; y += labelH + 6) for (let x = 8; x <= width - labelW - 8; x += labelW + 8) candidates.push(clamp(x, y));
      const rect = candidates.find(candidate => !placed.some(other => overlaps(candidate, other)));
      if (!rect) { needsDock = true; break; }
      placed.push(rect); positions.push({ marker, p, rect });
    }
    this.docked = needsDock;
    this.labelLayer.style.cssText = needsDock
      ? 'position:absolute;right:8px;top:82px;bottom:130px;width:188px;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:4px;pointer-events:auto;background:#ffffffb8;border-radius:8px'
      : 'position:absolute;inset:0;pointer-events:none';
    if (needsDock) {
      markers.forEach((marker, index) => {
        if (this.labelLayer.children.item(index) !== marker.button) this.labelLayer.insertBefore(marker.button, this.labelLayer.children.item(index));
        marker.button.style.position = 'relative'; marker.button.style.left = '0'; marker.button.style.top = '0'; marker.button.style.flexShrink = '0'; marker.button.style.width = '178px'; marker.leader.style.display = 'none';
      });
    } else {
      positions.forEach(({ marker, p, rect }) => {
        marker.button.style.position = 'absolute'; marker.button.style.width = `${labelW}px`;
        marker.button.style.left = `${rect.x}px`; marker.button.style.top = `${rect.y}px`;
        marker.leader.style.display = p.visible ? '' : 'none';
        marker.leader.setAttribute('x1', String(p.x)); marker.leader.setAttribute('y1', String(p.y));
        marker.leader.setAttribute('x2', String(rect.x + rect.w / 2)); marker.leader.setAttribute('y2', String(rect.y + rect.h / 2));
      });
    }
  }

  diagnostics() { return { targets: this.hidden ? [] : [...this.displayedIds], docked: this.docked, pathVisible: this.path.visible, readout: this.card.hidden ? '' : this.card.textContent }; }
  private remove(marker: Marker) { marker.events.abort(); disposeObject(marker.root); marker.button.remove(); marker.leader.remove(); this.markers.delete(marker.definition.id); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.events.abort(); this.markers.forEach(marker => marker.events.abort()); disposeObject(this.root); this.markers.clear(); this.layer.remove();
  }
}
