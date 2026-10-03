import { describe, expect, it } from 'vitest';
import type { AssemblyState, Quaternion } from '../contracts';
import { partDefinitions } from '../data/parts';
import { teachingSteps } from '../data/steps';
import { createAssemblyRules } from './index';
import type { SavedAssembly, SaveErrorCode } from './index';

const root = partDefinitions.find(d => d.prerequisites.length === 0)!;
const child = partDefinitions.find(d => d.prerequisites.length === 1 && d.prerequisites[0] === root.id)!;
const clone = <T>(value: T): T => structuredClone(value);
const rules = () => createAssemblyRules(partDefinitions, teachingSteps);

function installedState(): AssemblyState {
  const engine = rules();
  let state = engine.createInitialState();
  for (const d of [root, child]) {
    state = engine.apply(state, { type: 'SET_TRANSFORM', partId: d.id, transform: d.targetTransform }).state;
    state = engine.apply(state, { type: 'INSTALL_PART', partId: d.id }).state;
  }
  return state;
}
function saved(state = installedState()): SavedAssembly { return JSON.parse(rules().serialize(state)) as SavedAssembly; }
function expectFailure(input: unknown, code: SaveErrorCode) {
  const engine = rules(), result = engine.restore(input);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('unexpected restore success');
  expect(result.error.code).toBe(code);
  expect(result.state).toEqual(engine.createInitialState());
  expect(Object.keys(result.state.parts)).toHaveLength(partDefinitions.length);
}

describe('versioned saves and recovery', () => {
  it('round-trips actual assembly and UI settings without replaying history', () => {
    const engine = rules();
    let state = installedState();
    state = engine.apply(state, { type: 'SELECT_PART', partId: child.id }).state;
    state = engine.apply(state, { type: 'SET_MODE', mode: 'free' }).state;
    state = engine.apply(state, { type: 'SET_VIEW_PRESET', viewPreset: 'side' }).state;
    state = engine.apply(state, { type: 'SET_INTERACTION_MODE', interactionMode: 'rotate' }).state;
    state = engine.apply(state, { type: 'SET_EXPLODED', exploded: true }).state;
    const serialized = engine.serialize(state), record = JSON.parse(serialized) as SavedAssembly;
    expect(record.schemaVersion).toBe(1);
    expect(record.catalogSignature).toMatch(/^[0-9a-f]{8}$/);
    expect(record.checksum).toMatch(/^[0-9a-f]{8}$/);
    expect(record).not.toHaveProperty('history'); expect(record.snapshot).not.toHaveProperty('history');
    expect(engine.validateSave(serialized).ok).toBe(true);
    const restored = engine.restore(serialized);
    expect(restored.ok).toBe(true);
    expect(restored.state.parts).toEqual(state.parts);
    expect(restored.state).toMatchObject({ selectedPartId: child.id, mode: 'free', viewPreset: 'side', interactionMode: 'rotate', exploded: true, history: [], revision: 0 });
    expect(engine.getProgress(restored.state).installedCount).toBe(2);
    expect(engine.serialize(restored.state)).toBe(serialized);
  });
  it('preserves a movable uninstalled transform', () => {
    const engine = rules(), t = clone(root.initialTransform); t.position = [0.123, -4.5, 78];
    const state = engine.apply(engine.createInitialState(), { type: 'SET_TRANSFORM', partId: root.id, transform: t }).state;
    const restored = engine.restore(engine.serialize(state));
    expect(restored.ok).toBe(true);
    expect(restored.state.parts[root.id]).toEqual({ installed: false, transform: t });
  });
  it('accepts an equivalent signed installed quaternion and serializes the exact catalog target', () => {
    const engine = rules(), state = installedState();
    state.parts[root.id].transform.rotation = root.targetTransform.rotation.map(n => -n) as Quaternion;
    const record = JSON.parse(engine.serialize(state)) as SavedAssembly;
    expect(record.snapshot.parts[root.id].transform.rotation).toEqual(root.targetTransform.rotation);
    expect(engine.restore(record).ok).toBe(true);
  });
  it('works with an empty catalog', () => {
    const engine = createAssemblyRules([]);
    expect(engine.restore(engine.serialize(engine.createInitialState())).ok).toBe(true);
  });
  it.each([null, undefined, ''])('returns an actionable empty-save result for %s', input => expectFailure(input, 'EMPTY_SAVE'));
  it.each(['{', '{"schemaVersion":', 'this is not JSON'])('handles damaged JSON (%s)', input => expectFailure(input, 'INVALID_JSON'));
  it.each(['null', 'false', '3', '[]'])('handles JSON of the wrong shape (%s)', input => expectFailure(input, 'INVALID_SAVE'));
  it.each([0, 2, '1', undefined])('rejects incompatible versions (%s)', version => {
    const record = saved() as unknown as Record<string, unknown>; record.schemaVersion = version;
    expectFailure(record, 'UNSUPPORTED_VERSION');
  });
  it('rejects an unknown part including prototype-like ids', () => {
    const record = saved();
    Object.defineProperty(record.snapshot.parts, '__proto__', { enumerable: true, value: clone(record.snapshot.parts[root.id]) });
    expectFailure(record, 'UNKNOWN_PART');
  });
  it('rejects missing parts instead of partially loading', () => {
    const record = saved(); delete record.snapshot.parts[child.id];
    expectFailure(record, 'MISSING_PART');
  });
  it('rejects unknown selection', () => {
    const record = saved(); record.snapshot.selectedPartId = 'unknown';
    expectFailure(record, 'UNKNOWN_PART');
  });
  it.each(['mode', 'viewPreset', 'interactionMode', 'exploded'])('validates the %s setting', key => {
    const record = saved(); (record.snapshot as unknown as Record<string, unknown>)[key] = 'incorrect';
    expectFailure(record, 'INVALID_SAVE');
  });
  it('requires a boolean installed flag', () => {
    const record = saved(); (record.snapshot.parts[root.id] as unknown as Record<string, unknown>).installed = 1;
    expectFailure(record, 'INVALID_SAVE');
  });
  it.each(['nan', 'infinity', 'quaternion', 'scale', 'length', 'sparse'])('rejects invalid numeric data (%s)', kind => {
    const record = saved(), t = record.snapshot.parts[root.id].transform;
    if (kind === 'nan') t.position[0] = NaN;
    if (kind === 'infinity') t.position[1] = Infinity;
    if (kind === 'quaternion') t.rotation = [0, 0, 0, 2];
    if (kind === 'scale') t.scale[0] = 0;
    if (kind === 'length') t.rotation = [1, 0] as unknown as Quaternion;
    if (kind === 'sparse') t.position = Array(3) as typeof t.position;
    expectFailure(record, 'INVALID_TRANSFORM');
  });
  it('rejects installed parts whose prerequisites are uninstalled', () => {
    const record = saved(); record.snapshot.parts[root.id].installed = false;
    const restored = rules().restore(record);
    expect(restored.ok).toBe(false);
    if (!restored.ok) expect(restored.error).toMatchObject({ code: 'DEPENDENCY_INCONSISTENT', relatedPartIds: [root.id] });
    expect(restored.state.parts).toEqual(rules().createInitialState().parts);
  });
  it('rejects installed positions inside installation tolerance but not exactly snapped', () => {
    const record = saved(); record.snapshot.parts[root.id].transform.position[0] += root.tolerances.position / 2;
    expectFailure(record, 'INSTALLED_TRANSFORM_MISMATCH');
  });
  it('rejects altered installed orientation and scale', () => {
    const orientation = saved(); orientation.snapshot.parts[root.id].transform.rotation = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
    expectFailure(orientation, 'INSTALLED_TRANSFORM_MISMATCH');
    const scale = saved(); scale.snapshot.parts[root.id].transform.scale[0] *= 2;
    expectFailure(scale, 'INSTALLED_TRANSFORM_MISMATCH');
  });
  it('detects checksum damage and otherwise valid snapshot edits', () => {
    const badChecksum = saved(); badChecksum.checksum = 'wrong';
    expectFailure(badChecksum, 'CHECKSUM_MISMATCH');
    const altered = saved(rules().createInitialState()); altered.snapshot.parts[root.id].transform.position[0] += 1;
    expectFailure(altered, 'CHECKSUM_MISMATCH');
  });
  it('rejects a save when targets, dependencies, or tolerance rules change', () => {
    const record = saved();
    for (const mutate of [
      (definitions: typeof partDefinitions) => { definitions[0].targetTransform.position[0] += 1; },
      (definitions: typeof partDefinitions) => { definitions.find(d => d.id === child.id)!.prerequisites = []; },
      (definitions: typeof partDefinitions) => { definitions[0].tolerances.position /= 2; },
    ]) {
      const definitions = clone(partDefinitions); mutate(definitions);
      const restored = createAssemblyRules(definitions).restore(record);
      expect(restored.ok).toBe(false);
      if (!restored.ok) expect(restored.error.code).toBe('CATALOG_MISMATCH');
    }
  });
  it('does not invalidate compatible saves when catalog order changes', () => {
    const restored = createAssemblyRules([...partDefinitions].reverse(), teachingSteps).restore(saved());
    expect(restored.ok).toBe(true);
    expect(restored.state.parts).toEqual(installedState().parts);
  });
  it('does not consume unsolicited saved history or revision', () => {
    const record = saved() as SavedAssembly & { history: unknown; revision: unknown };
    record.history = [{ parts: { invalid: 'unsafe history' } }]; record.revision = -99;
    const result = rules().restore(record);
    expect(result.ok).toBe(true);
    expect(result.state.history).toEqual([]); expect(result.state.revision).toBe(0);
  });
  it('keeps parsed input and live state isolated', () => {
    const engine = rules(), record = saved(), before = clone(record);
    const result = engine.restore(record);
    expect(record).toEqual(before);
    result.state.parts[root.id].transform.position[0] += 10;
    expect(record).toEqual(before);
  });
  it('bounds saved string length and survives hostile or cyclic object inputs', () => {
    expectFailure(' '.repeat(2_000_001), 'SAVE_TOO_LARGE');
    expectFailure({ get schemaVersion() { throw new Error('getter failed'); } }, 'INVALID_SAVE');
    const record = saved() as SavedAssembly & { recursive?: unknown };
    (record.snapshot as unknown as Record<string, unknown>).recursive = record.snapshot;
    expectFailure(record, 'INVALID_SAVE');
  });
  it('can perform normal assembly operations after a bad restore', () => {
    const engine = rules(), recovered = engine.restore('damaged');
    const aligned = engine.apply(recovered.state, { type: 'SET_TRANSFORM', partId: root.id, transform: root.targetTransform }).state;
    expect(engine.apply(aligned, { type: 'INSTALL_PART', partId: root.id }).feedback?.ok).toBe(true);
  });
  it('refuses to serialize invalid live assembly instead of issuing an apparently valid save', () => {
    const engine = rules(), state = installedState();
    state.parts[root.id].installed = false;
    expect(() => engine.serialize(state)).toThrow('INVALID_STATE: DEPENDENCY_INCONSISTENT');
  });
});
