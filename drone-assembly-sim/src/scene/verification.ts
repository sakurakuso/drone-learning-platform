/** Local QA harness. Not imported by the production scene or app. */
import { createWorkbenchSceneAdapter } from './index';
import type { WorkbenchSceneAdapter } from './index';
import { createAssemblyRules } from '../assembly';
import { partDefinitions } from '../data/parts';
import type { AssemblyAction, SceneMetrics, SceneUserOperation } from '../contracts';

const container = document.querySelector<HTMLElement>('#workbench')!;
const output = document.querySelector<HTMLElement>('#diagnostics')!;
const result = document.querySelector<HTMLElement>('#results')!;
const rules = createAssemblyRules(partDefinitions);
let state = rules.createInitialState();
let adapter: WorkbenchSceneAdapter;
let lastMetrics: SceneMetrics | undefined;
let operations: SceneUserOperation[] = [];
let errors: string[] = [];
let report: unknown = null;
const samples: SceneMetrics[] = [];

// Counts actual add/remove registrations, including AbortSignal removals.
// The originals remain responsible for event semantics. This is QA-only instrumentation.
const originalAdd = EventTarget.prototype.addEventListener;
const originalRemove = EventTarget.prototype.removeEventListener;
let recordingScene = false;
const registrations: { target: EventTarget; type: string; listener: EventListenerOrEventListenerObject; capture: boolean; live: boolean; sceneOwned: boolean }[] = [];
EventTarget.prototype.addEventListener = function(type, listener, options) {
  const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
  if (listener && !registrations.some(r => r.target === this && r.type === type && r.listener === listener && r.capture === capture && r.live)) {
    // Browser automation also installs document listeners; count only scene-owned listeners.
    const entry = { target: this, type, listener, capture, live: true, sceneOwned: recordingScene || this instanceof HTMLCanvasElement || Boolean(new Error().stack?.includes('OrbitControls')) };
    registrations.push(entry);
    if (typeof options === 'object' && options.signal) {
      if (options.signal.aborted) entry.live = false;
      else originalAdd.call(options.signal, 'abort', () => { entry.live = false; }, { once: true });
    }
  }
  originalAdd.call(this, type, listener, options);
};
EventTarget.prototype.removeEventListener = function(type, listener, options) {
  const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
  registrations.filter(r => r.target === this && r.type === type && r.listener === listener && r.capture === capture).forEach(r => { r.live = false; });
  originalRemove.call(this, type, listener, options);
};
let registrationStart = 0;
function liveSceneListeners() { return registrations.slice(registrationStart).filter(r => r.live && r.sceneOwned && (r.target === window || r.target === document || r.target instanceof HTMLCanvasElement)).map(r => r.type); }

function dispatch(action: AssemblyAction) {
  const transition = rules.apply(state, action);
  state = transition.state;
  adapter.update(state, partDefinitions);
  result.textContent = transition.feedback ? JSON.stringify(transition.feedback) : 'State updated by shared rules';
  refresh();
}
function mount() {
  registrationStart = registrations.length;
  recordingScene = true;
  adapter = createWorkbenchSceneAdapter({ container, definitions: partDefinitions, state,
    onOperation(operation) { operations.push(operation); dispatch(operation); },
    onMetrics(metrics) { lastMetrics = metrics; samples.push(metrics); refresh(); },
    onError(message) { errors.push(message); refresh(); },
  });
  recordingScene = false;
  refresh();
}
function refresh() {
  if (!adapter) return;
  const diagnostics = adapter.getDiagnostics();
  output.textContent = JSON.stringify({
    environment: { userAgent: navigator.userAgent, devicePixelRatio, viewport: [innerWidth, innerHeight], sampleMethod: 'RAF count over >=1000ms, elapsed/frames; drawCalls from renderer.info.render.calls' },
    operationCounts: { select: operations.filter(o => o.type === 'SELECT_PART').length, transform: operations.filter(o => o.type === 'SET_TRANSFORM').length },
    operations: operations.slice(-3), selected: state.selectedPartId,
    actualTransform: state.selectedPartId ? state.parts[state.selectedPartId].transform : null,
    installed: state.selectedPartId ? state.parts[state.selectedPartId].installed : null,
    lastMetrics, sampleCount: samples.length, errors, report,
    performanceSummary: samples.length ? { samples: samples.slice(-10).length, fpsMin: Math.min(...samples.slice(-10).map(m => m.fps)), fpsMax: Math.max(...samples.slice(-10).map(m => m.fps)), fpsMean: samples.slice(-10).reduce((sum, m) => sum + m.fps, 0) / Math.min(samples.length, 10) } : null,
    diagnostics, liveSceneListeners: liveSceneListeners(),
  }, null, 2);
}
function action(id: string, handler: () => void) { document.querySelector(`#${id}`)!.addEventListener('click', handler); }
const picker = document.querySelector<HTMLSelectElement>('#part')!;
partDefinitions.forEach(d => { const option = document.createElement('option'); option.value = d.id; option.textContent = `${d.nameEn} · ${d.id}`; picker.append(option); });
picker.addEventListener('change', () => dispatch({ type: 'SELECT_PART', partId: picker.value || null }));
action('move', () => dispatch({ type: 'SET_INTERACTION_MODE', interactionMode: 'translate' }));
action('rotate', () => dispatch({ type: 'SET_INTERACTION_MODE', interactionMode: 'rotate' }));
action('align', () => { const definition = partDefinitions.find(d => d.id === state.selectedPartId); if (definition) dispatch({ type: 'SET_TRANSFORM', partId: definition.id, transform: definition.targetTransform }); });
action('install', () => { if (state.selectedPartId) dispatch({ type: 'INSTALL_PART', partId: state.selectedPartId }); });
action('reset', () => { operations = []; errors = []; dispatch({ type: 'RESET' }); });
action('explode', () => dispatch({ type: 'SET_EXPLODED', exploded: !state.exploded }));
action('narrow', () => { container.style.width = '640px'; }); action('wide', () => { container.style.width = '100%'; });
action('short', () => { container.style.height = '360px'; }); action('tall', () => { container.style.height = '580px'; });
action('dispose', () => { adapter.dispose(); refresh(); });
action('mount', () => { adapter.dispose(); mount(); });
action('badstate', () => { const invalid = structuredClone(state); delete invalid.parts[partDefinitions[0].id]; adapter.update(invalid, partDefinitions); refresh(); });
action('language', () => { adapter.setLanguage('zh'); refresh(); });
action('context', () => {
  const canvas = container.querySelector('canvas');
  const extension = canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context');
  extension?.loseContext(); setTimeout(() => extension?.restoreContext(), 500);
});
container.addEventListener('input', refresh);
container.addEventListener('click', refresh);
action('checks', () => {
  const checks: Record<string, boolean> = {};
  const serialized = JSON.stringify(state);
  const baseline = adapter.getDiagnostics();
  const operationBaseline = operations.length;
  adapter.setExplosionAmount(0.75);
  const exploded = adapter.getDiagnostics();
  checks.explosionChangesDisplayOnly = JSON.stringify(state) === serialized && partDefinitions.every(d => exploded.objects[d.id].position.every((v, i) => Math.abs(v - (state.parts[d.id].transform.position[i] + d.explosionOffset[i] * 0.75)) < 1e-8));
  adapter.setExplosionAmount(0);
  checks.restorationExact = Object.keys(baseline.objects).every(id => JSON.stringify(adapter.getDiagnostics().objects[id].position) === JSON.stringify(baseline.objects[id].position));
  adapter.update(state, partDefinitions);
  checks.updateDoesNotEcho = operations.length === operationBaseline;
  adapter.setHideOuter(true);
  checks.outerHidden = partDefinitions.filter(d => d.category === 'guard').every(d => !adapter.getDiagnostics().objects[d.id].visible);
  adapter.setHideOuter(false);
  dispatch({ type: 'SELECT_PART', partId: partDefinitions[0].id });
  adapter.setIsolation(true);
  checks.isolation = Object.entries(adapter.getDiagnostics().objects).every(([id, value]) => value.visible === (id === state.selectedPartId));
  adapter.setIsolation(false);
  const geometryBaseline = adapter.getDiagnostics().resources?.geometries;
  for (let i = 0; i < 20; i++) adapter.update(state, partDefinitions);
  checks.resourcesStableAcrossUpdate = adapter.getDiagnostics().resources?.geometries === geometryBaseline;
  adapter.dispose(); adapter.dispose();
  const after = adapter.getDiagnostics();
  checks.disposeClearsCanvas = container.querySelectorAll('canvas').length === 0;
  checks.disposeClearsResources = after.resources?.geometries === 0 && after.resources?.textures === 0;
  checks.disposeClearsListeners = liveSceneListeners().length === 0;
  const remainingListeners = liveSceneListeners();
  for (let i = 0; i < 3; i++) { mount(); adapter.dispose(); checks[`repeatDispose${i}`] = liveSceneListeners().length === 0; }
  report = { ...checks, remainingListeners };
  mount(); result.textContent = JSON.stringify(checks); refresh();
});
mount();
// Diagnostics are displayed, so browser verification uses visible evidence rather than private state.
const timer = setInterval(refresh, 200);
originalAdd.call(window, 'pagehide', () => {
  clearInterval(timer); adapter.dispose();
  EventTarget.prototype.addEventListener = originalAdd;
  EventTarget.prototype.removeEventListener = originalRemove;
}, { once: true });
