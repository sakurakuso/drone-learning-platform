import type { AssemblySnapshot, AssemblyState, PartId } from '../contracts';
import { cloneSnapshot } from './catalog';
import type { Catalog } from './catalog';
import { cloneTransform, equalScale, isValidTransform, positionDistance, quaternionAngle } from './math';
import type { AssemblyEngine, SaveError, SavedAssembly, SaveValidation } from './types';

const MAX_SAVE_LENGTH = 2_000_000;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

/** Accidental-corruption detection, not authentication or a security signature. */
function checksum(value: unknown): string {
  const text = canonical(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createPersistence(catalog: Catalog, createInitialState: () => AssemblyState): Pick<AssemblyEngine, 'serialize' | 'validateSave' | 'restore'> {
  const catalogSignature = checksum(catalog.definitions.map(d => ({ id: d.id, initialTransform: d.initialTransform, targetTransform: d.targetTransform, prerequisites: [...d.prerequisites].sort(), tolerances: d.tolerances })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const failure = (code: SaveError['code'], path?: string, relatedPartIds?: PartId[]): SaveValidation => ({ ok: false, error: { code, path, relatedPartIds } });

  function validateSnapshot(value: unknown): SaveValidation {
    if (!object(value) || !object(value.parts)) return failure('INVALID_SAVE', 'snapshot.parts');
    const ids = Object.keys(value.parts);
    const unknown = ids.filter(id => !catalog.byId.has(id));
    if (unknown.length) return failure('UNKNOWN_PART', 'snapshot.parts', unknown);
    const missing = catalog.definitions.filter(d => !Object.hasOwn(value.parts as object, d.id)).map(d => d.id);
    if (missing.length) return failure('MISSING_PART', 'snapshot.parts', missing);
    if (value.selectedPartId !== null && (typeof value.selectedPartId !== 'string' || !catalog.byId.has(value.selectedPartId))) return failure('UNKNOWN_PART', 'snapshot.selectedPartId');
    if (!['guided', 'free'].includes(value.mode as string) || typeof value.exploded !== 'boolean'
      || !['translate', 'rotate'].includes(value.interactionMode as string) || !['perspective', 'top', 'front', 'side'].includes(value.viewPreset as string)) return failure('INVALID_SAVE', 'snapshot.settings');
    const parts: AssemblySnapshot['parts'] = Object.fromEntries(catalog.definitions.map(d => [d.id, { installed: false, transform: cloneTransform(d.initialTransform) }]));
    for (const definition of catalog.definitions) {
      const part = value.parts[definition.id];
      if (!object(part) || typeof part.installed !== 'boolean') return failure('INVALID_SAVE', `snapshot.parts.${definition.id}`);
      if (!isValidTransform(part.transform)) return failure('INVALID_TRANSFORM', `snapshot.parts.${definition.id}.transform`);
      if (part.installed) {
        const missingDeps = definition.prerequisites.filter(id => !object((value.parts as Record<string, unknown>)[id]) || (value.parts as Record<string, Record<string, unknown>>)[id].installed !== true);
        if (missingDeps.length) return failure('DEPENDENCY_INCONSISTENT', `snapshot.parts.${definition.id}`, missingDeps);
        // Installed states must be snapped, not merely inside installation tolerance.
        if (positionDistance(part.transform, definition.targetTransform) > 1e-9 || quaternionAngle(part.transform.rotation, definition.targetTransform.rotation) > 1e-8 || !equalScale(part.transform, definition.targetTransform)) return failure('INSTALLED_TRANSFORM_MISMATCH', `snapshot.parts.${definition.id}.transform`);
      }
      parts[definition.id] = { installed: part.installed, transform: cloneTransform(part.installed ? definition.targetTransform : part.transform) };
    }
    return { ok: true, snapshot: { parts, selectedPartId: value.selectedPartId as PartId | null, mode: value.mode as AssemblySnapshot['mode'], exploded: value.exploded, interactionMode: value.interactionMode as AssemblySnapshot['interactionMode'], viewPreset: value.viewPreset as AssemblySnapshot['viewPreset'] } };
  }

  function validateSave(input: unknown): SaveValidation {
    if (input === null || input === undefined || input === '') return failure('EMPTY_SAVE');
    if (typeof input === 'string' && input.length > MAX_SAVE_LENGTH) return failure('SAVE_TOO_LARGE');
    let parsed: unknown;
    try { parsed = typeof input === 'string' ? JSON.parse(input) as unknown : input; }
    catch { return failure('INVALID_JSON'); }
    try {
      if (!object(parsed)) return failure('INVALID_SAVE');
      if (parsed.schemaVersion !== 1) return failure('UNSUPPORTED_VERSION', 'schemaVersion');
      if (parsed.catalogSignature !== catalogSignature) return failure('CATALOG_MISMATCH', 'catalogSignature');
      const validation = validateSnapshot(parsed.snapshot);
      if (!validation.ok) return validation;
      if (typeof parsed.checksum !== 'string' || parsed.checksum !== checksum({ schemaVersion: parsed.schemaVersion, catalogSignature: parsed.catalogSignature, snapshot: parsed.snapshot })) return failure('CHECKSUM_MISMATCH', 'checksum');
      return validation;
    } catch { return failure('INVALID_SAVE'); }
  }
  function serialize(state: AssemblyState): string {
    const validation = validateSnapshot(state);
    if (!validation.ok || state.schemaVersion !== 1) throw new Error(`INVALID_STATE: ${validation.ok ? 'UNSUPPORTED_VERSION' : validation.error.code}`);
    const payload = { schemaVersion: 1 as const, catalogSignature, snapshot: validation.snapshot };
    const saved: SavedAssembly = { ...payload, checksum: checksum(payload) };
    return JSON.stringify(saved);
  }
  function restore(input: unknown): ReturnType<AssemblyEngine['restore']> {
    const validation = validateSave(input);
    if (!validation.ok) return { ok: false, state: createInitialState(), error: validation.error };
    // Only verified snapshot fields are restored. History/revision/drag data are deliberately not persisted.
    return { ok: true, state: { ...cloneSnapshot(validation.snapshot), schemaVersion: 1, history: [], revision: 0 } };
  }
  return { serialize, validateSave, restore };
}
