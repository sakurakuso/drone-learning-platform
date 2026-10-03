import type { AssemblySnapshot, AssemblyState, PartDefinition, Transform } from '../contracts';
export const STORAGE_KEY = 'drone-assembly-sim:progress:v1';
const modes = ['guided', 'free']; const interactions = ['translate', 'rotate']; const views = ['perspective', 'top', 'front', 'side'];
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const vector = (x: unknown, n: number): x is number[] => Array.isArray(x) && x.length === n && x.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 10000);
function validTransform(x: unknown): x is Transform {
  if (!record(x) || !vector(x.position, 3) || !vector(x.rotation, 4) || !vector(x.scale, 3)) return false;
  const norm = Math.hypot(...x.rotation);
  return Math.abs(norm - 1) <= 1e-6 && x.scale.every(s => s > 0 && s < 100);
}
export const definitionSignature = (definitions: readonly PartDefinition[]) => JSON.stringify(definitions.map(p => [p.id, p.targetTransform, p.prerequisites, p.tolerances]));
export function validSnapshot(x: unknown, definitions: readonly PartDefinition[]): x is AssemblySnapshot {
  if (!record(x) || !record(x.parts) || Object.keys(x.parts).length !== definitions.length || !modes.includes(String(x.mode)) || !interactions.includes(String(x.interactionMode)) || !views.includes(String(x.viewPreset)) || typeof x.exploded !== 'boolean' || !(x.selectedPartId === null || definitions.some(p => p.id === x.selectedPartId))) return false;
  const parts = x.parts;
  return definitions.every(p => {
    const item = parts[p.id];
    if (!record(item) || !validTransform(item.transform) || typeof item.installed !== 'boolean') return false;
    if (!item.installed) return true;
    const t = item.transform; const target = p.targetTransform;
    const dist = Math.hypot(...t.position.map((v,i) => v - target.position[i]));
    const dot = Math.abs(t.rotation.reduce((s,v,i) => s + v * target.rotation[i], 0));
    // Installation snaps to the exact target; placement tolerance applies only to loose parts.
    return dist <= 1e-6 && 2 * Math.acos(Math.min(1, dot)) <= 1e-6 && t.scale.every((s,i) => Math.abs(s - target.scale[i]) < 1e-6) && p.prerequisites.every(id => record(parts[id]) && parts[id].installed === true);
  });
}
export function validState(x: unknown, definitions: readonly PartDefinition[]): x is AssemblyState {
  return record(x) && validSnapshot(x, definitions) && x.schemaVersion === 1 && Number.isSafeInteger(x.revision) && Number(x.revision) >= 0 && Array.isArray(x.history) && x.history.length <= 100 && x.history.every(s => validSnapshot(s, definitions));
}
export type LoadStatus = 'new' | 'restored' | 'invalid' | 'unavailable';
export function loadProgress(storage: Pick<Storage,'getItem'>, definitions: readonly PartDefinition[]): { state?: AssemblyState; status: LoadStatus } {
  try {
    const raw = storage.getItem(STORAGE_KEY); if (!raw) return { status: 'new' };
    if (raw.length > 2_000_000) return { status: 'invalid' };
    let data: unknown;
    try { data = JSON.parse(raw); } catch { return { status: 'invalid' }; }
    if (!record(data) || data.version !== 1 || data.definitionSignature !== definitionSignature(definitions) || !validState(data.state, definitions)) return { status: 'invalid' };
    return { state: structuredClone(data.state), status: 'restored' };
  } catch { return { status: 'unavailable' }; }
}
export function saveProgress(storage: Pick<Storage,'setItem'>, state: AssemblyState, definitions: readonly PartDefinition[]): boolean {
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, definitionSignature: definitionSignature(definitions), savedAt: new Date().toISOString(), state })); return true; } catch { return false; }
}
