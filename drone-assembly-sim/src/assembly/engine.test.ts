import { describe, expect, it } from 'vitest';
import type { AssemblyRules, AssemblyState, PartDefinition, Quaternion, Transform } from '../contracts';
import { partDefinitions } from '../data/parts';
import { teachingSteps } from '../data/steps';
import { createAssemblyRules } from './index';

const root = partDefinitions.find(d => d.prerequisites.length === 0)!;
const child = partDefinitions.find(d => d.prerequisites.includes(root.id))!;
const middle = partDefinitions.find(d => partDefinitions.some(p => p.prerequisites.length === 1 && p.prerequisites[0] === d.id) && d.prerequisites.includes(root.id))!;
const leaf = partDefinitions.find(d => d.prerequisites.includes(middle.id))!;
const clone = <T>(value: T): T => structuredClone(value);
const rules = () => createAssemblyRules(partDefinitions, teachingSteps);

function place(engine: AssemblyRules, state: AssemblyState, d: PartDefinition, transform = d.targetTransform): AssemblyState {
  return engine.apply(state, { type: 'SET_TRANSFORM', partId: d.id, transform }).state;
}
function install(engine: AssemblyRules, state: AssemblyState, definition: PartDefinition): AssemblyState {
  if (state.parts[definition.id].installed) return state;
  for (const id of definition.prerequisites) if (!state.parts[id].installed) state = install(engine, state, partDefinitions.find(d => d.id === id)!);
  const transition = engine.apply(place(engine, state, definition), { type: 'INSTALL_PART', partId: definition.id });
  expect(transition.feedback?.code).toBe('OK');
  return transition.state;
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(v => deepFreeze(v));
  }
  return value;
}

describe('installation uses shared catalog and teaching rules', () => {
  it('implements the shared factory interface and creates isolated initial states', () => {
    const engine: AssemblyRules = rules();
    const first = engine.createInitialState(), second = engine.createInitialState();
    expect(Object.keys(first.parts)).toEqual(partDefinitions.map(d => d.id));
    expect(first.schemaVersion).toBe(1);
    expect(first.history).toEqual([]);
    first.parts[root.id].transform.position[0] += 100;
    expect(second.parts[root.id].transform).toEqual(root.initialTransform);
    expect(root.initialTransform).not.toEqual(first.parts[root.id].transform);
  });
  it('snaps exactly to the target after a nearby valid placement without mutating input', () => {
    const engine = rules();
    const nearby = clone(root.targetTransform);
    nearby.position[0] += root.tolerances.position / 2;
    nearby.rotation = [Math.sin(root.tolerances.angleRadians / 4), 0, 0, Math.cos(root.tolerances.angleRadians / 4)];
    const before = deepFreeze(place(engine, engine.createInitialState(), root, nearby));
    const transition = engine.apply(before, { type: 'INSTALL_PART', partId: root.id });
    expect(transition.feedback?.ok).toBe(true);
    expect(transition.state.parts[root.id]).toEqual({ installed: true, transform: root.targetTransform });
    expect(before.parts[root.id].installed).toBe(false);
    expect(transition.state.parts[root.id].transform).not.toBe(root.targetTransform);
    expect(transition.state.history).toHaveLength(before.history.length + 1);
  });
  it('rejects a wrong slot even when target coordinates happen to coincide', () => {
    const definitions = clone(partDefinitions);
    definitions.find(d => d.id === child.id)!.targetTransform = clone(root.targetTransform);
    const engine = createAssemblyRules(definitions);
    const state = place(engine, engine.createInitialState(), root);
    const checked = engine.installAt(state, root.id, child.id);
    expect(checked.feedback).toEqual({ ok: false, code: 'WRONG_SLOT', partId: root.id, slotId: child.id, expectedSlotId: root.id });
    expect(checked.state).toBe(state);
    expect(engine.checkSlot(state, root.id, 'absent-slot').code).toBe('WRONG_SLOT');
  });
  it('checks missing prerequisites in both modes before installation', () => {
    const engine = rules();
    for (const mode of ['guided', 'free'] as const) {
      let state = engine.apply(engine.createInitialState(), { type: 'SET_MODE', mode }).state;
      state = place(engine, state, child);
      const transition = engine.apply(state, { type: 'INSTALL_PART', partId: child.id });
      expect(transition.feedback).toMatchObject({ code: 'MISSING_PREREQUISITES', relatedPartIds: child.prerequisites });
      expect(transition.state).toBe(state);
    }
  });
  it('does not enforce an arbitrary teaching step order in guided mode', () => {
    const engine = rules();
    let state = install(engine, engine.createInitialState(), root);
    const laterStepPart = partDefinitions.find(d => d.category === 'control')!;
    state = install(engine, state, laterStepPart);
    expect(state.parts[laterStepPart.id].installed).toBe(true);
    expect(state.parts[child.id].installed).toBe(false);
  });
  it.each([-1, 1])('accepts the inclusive position boundary on either side (%s)', sign => {
    const engine = rules(), transform = clone(root.targetTransform);
    transform.position[0] += sign * root.tolerances.position;
    const state = place(engine, engine.createInitialState(), root, transform);
    expect(engine.checkInstall(state, root.id).code).toBe('OK');
  });
  it('rejects just outside the position boundary and reports measured and allowed distance', () => {
    const engine = rules(), transform = clone(root.targetTransform);
    transform.position[0] += root.tolerances.position + 1e-8;
    const state = place(engine, engine.createInitialState(), root, transform);
    const check = engine.checkInstall(state, root.id);
    expect(check.code).toBe('POSITION_OUT_OF_TOLERANCE');
    expect(check.positionError).toBeGreaterThan(root.tolerances.position);
    expect(check.positionTolerance).toBe(root.tolerances.position);
  });
  it('uses Euclidean distance, rejecting diagonal offsets even if each axis is inside tolerance', () => {
    const engine = rules(), transform = clone(root.targetTransform);
    transform.position[0] += root.tolerances.position * 0.8;
    transform.position[2] += root.tolerances.position * 0.8;
    expect(engine.checkInstall(place(engine, engine.createInitialState(), root, transform), root.id).code).toBe('POSITION_OUT_OF_TOLERANCE');
  });
  it.each([-1, 0, 1])('tests just inside, exactly at, and just outside angular tolerance (%s)', offset => {
    const engine = rules(), transform = clone(root.targetTransform);
    const angle = root.tolerances.angleRadians + offset * 1e-8;
    transform.rotation = [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];
    const state = place(engine, engine.createInitialState(), root, transform);
    const check = engine.checkInstall(state, root.id);
    expect(check.code).toBe(offset > 0 ? 'ANGLE_OUT_OF_TOLERANCE' : 'OK');
    expect(check.angleErrorRadians).toBeCloseTo(angle, 12);
    expect(check.angleToleranceRadians).toBe(root.tolerances.angleRadians);
  });
  it('rejects a valid quaternion with wrong direction', () => {
    const engine = rules(), transform = clone(root.targetTransform);
    transform.rotation = [Math.SQRT1_2, 0, 0, Math.SQRT1_2];
    const state = place(engine, engine.createInitialState(), root, transform);
    expect(engine.checkInstall(state, root.id).code).toBe('ANGLE_OUT_OF_TOLERANCE');
    expect(engine.checkInstall(state, root.id).angleErrorRadians).toBeCloseTo(Math.PI / 2, 12);
  });
  it('treats q and -q as equivalent for a nonidentity target and snaps to catalog quaternion', () => {
    const definitions = clone(partDefinitions), d = definitions.find(d => d.id === root.id)!;
    d.targetTransform.rotation = [0.5, -0.5, 0.5, 0.5];
    const engine = createAssemblyRules(definitions), transform = clone(d.targetTransform);
    transform.rotation = transform.rotation.map(n => -n) as Quaternion;
    const state = place(engine, engine.createInitialState(), d, transform);
    expect(engine.checkInstall(state, d.id).angleErrorRadians).toBe(0);
    expect(engine.apply(state, { type: 'INSTALL_PART', partId: d.id }).state.parts[d.id].transform.rotation).toEqual(d.targetTransform.rotation);
  });
  it('preserves precision for tiny rotations at zero angular tolerance', () => {
    const definitions = clone(partDefinitions), d = definitions.find(d => d.id === root.id)!;
    d.tolerances.angleRadians = 0;
    const engine = createAssemblyRules(definitions), transform = clone(d.targetTransform);
    transform.rotation = [Math.sin(1e-6 / 2), 0, 0, Math.cos(1e-6 / 2)];
    expect(engine.checkInstall(place(engine, engine.createInitialState(), d, transform), d.id).code).toBe('ANGLE_OUT_OF_TOLERANCE');
  });
  it('checks scale independently and returns parameters', () => {
    const engine = rules(), transform = clone(root.targetTransform);
    transform.scale[0] *= 2;
    const state = place(engine, engine.createInitialState(), root, transform);
    expect(engine.checkInstall(state, root.id)).toMatchObject({ code: 'SCALE_MISMATCH', expectedScale: root.targetTransform.scale, actualScale: transform.scale });
  });
  it('rejects unknown ids without creating phantom parts', () => {
    const engine = rules(), state = engine.createInitialState();
    for (const action of [{ type: 'SELECT_PART' as const, partId: 'unknown' }, { type: 'INSTALL_PART' as const, partId: 'unknown' }, { type: 'REMOVE_PART' as const, partId: 'unknown' }, { type: 'SET_TRANSFORM' as const, partId: 'unknown', transform: root.targetTransform }]) {
      expect(engine.apply(state, action)).toEqual({ state, feedback: { ok: false, code: 'UNKNOWN_PART', partId: 'unknown' } });
    }
    expect(engine.checkInstall(state, '__proto__').code).toBe('UNKNOWN_PART');
  });
  it('locks installed pieces and does not create undo entries on repeat install', () => {
    const engine = rules(), state = install(engine, engine.createInitialState(), root);
    const repeated = engine.apply(state, { type: 'INSTALL_PART', partId: root.id });
    const moved = engine.apply(state, { type: 'SET_TRANSFORM', partId: root.id, transform: root.initialTransform });
    expect(repeated.feedback?.code).toBe('ALREADY_INSTALLED');
    expect(moved.feedback?.code).toBe('PART_LOCKED');
    expect(repeated.state).toBe(state); expect(moved.state).toBe(state);
  });
  it('ignores explosion offsets when checking installation, while forbidding display-view edits', () => {
    const engine = rules();
    let state = place(engine, engine.createInitialState(), root);
    state = engine.apply(state, { type: 'SET_EXPLODED', exploded: true }).state;
    expect(engine.checkInstall(state, root.id).ok).toBe(true);
    const attempt = engine.apply(state, { type: 'SET_TRANSFORM', partId: root.id, transform: root.initialTransform });
    expect(attempt.state).toBe(state);
    expect(attempt.feedback?.code).toBe('EXPLODED_VIEW_ACTIVE');
    expect(engine.apply(state, { type: 'INSTALL_PART', partId: root.id }).state.parts[root.id].transform).toEqual(root.targetTransform);
  });
  it('can complete all 17 shared parts and all teaching steps', () => {
    const engine = rules();
    let state = engine.createInitialState();
    for (const d of [...partDefinitions].reverse()) state = install(engine, state, d);
    const progress = engine.getProgress(state);
    expect(progress).toMatchObject({ installedCount: 17, totalCount: 17, fraction: 1, complete: true, availablePartIds: [], currentStepId: null, nextHint: { code: 'ASSEMBLY_COMPLETE' } });
    expect(progress.steps.every(s => s.status === 'complete')).toBe(true);
  });
});

describe('transform validity, transactions and undo', () => {
  const invalid: [string, (t: Transform) => void][] = [
    ['NaN position', t => { t.position[0] = NaN; }], ['infinite position', t => { t.position[2] = Infinity; }],
    ['zero quaternion', t => { t.rotation = [0, 0, 0, 0]; }], ['nonunit quaternion', t => { t.rotation = [0, 0, 0, 2]; }],
    ['negative scale', t => { t.scale[0] = -1; }], ['zero scale', t => { t.scale[1] = 0; }],
    ['sparse position', t => { t.position = Array(3) as Transform['position']; }],
    ['wrong tuple length', t => { t.position = [0, 0] as unknown as Transform['position']; }],
  ];
  it.each(invalid)('rejects %s without altering history', (_name, mutate) => {
    const engine = rules(), state = engine.createInitialState(), transform = clone(root.targetTransform);
    mutate(transform);
    const transition = engine.apply(state, { type: 'SET_TRANSFORM', partId: root.id, transform });
    expect(transition.feedback?.code).toBe('INVALID_TRANSFORM');
    expect(transition.state).toBe(state);
  });
  it('does not store a no-op transform', () => {
    const engine = rules(), state = engine.createInitialState();
    expect(engine.apply(state, { type: 'SET_TRANSFORM', partId: root.id, transform: clone(state.parts[root.id].transform) }).state).toBe(state);
  });
  it('keeps selection/view changes out of history and preserves current UI settings on undo', () => {
    const engine = rules();
    let state = engine.apply(engine.createInitialState(), { type: 'SELECT_PART', partId: root.id }).state;
    expect(state.history).toHaveLength(0);
    state = place(engine, state, root);
    state = engine.apply(state, { type: 'SET_MODE', mode: 'free' }).state;
    state = engine.apply(state, { type: 'SET_VIEW_PRESET', viewPreset: 'top' }).state;
    state = engine.apply(state, { type: 'SET_INTERACTION_MODE', interactionMode: 'rotate' }).state;
    state = engine.apply(state, { type: 'SET_EXPLODED', exploded: true }).state;
    expect(state.history).toHaveLength(1);
    const restored = engine.apply(state, { type: 'UNDO' }).state;
    expect(restored.parts[root.id].transform).toEqual(root.initialTransform);
    expect(restored).toMatchObject({ mode: 'free', viewPreset: 'top', interactionMode: 'rotate', exploded: true, selectedPartId: root.id, history: [] });
    expect(restored.revision).toBe(state.revision + 1);
  });
  it('records 100 preview frames as one drag and one undo', () => {
    const engine = rules(), state = engine.createInitialState();
    const started = engine.beginDrag(state, root.id);
    expect(started.ok).toBe(true); if (!started.ok) return;
    let session = started.session;
    for (let frame = 0; frame < 100; frame++) {
      const transform = clone(root.initialTransform);
      transform.position[0] += frame / 100 + 1;
      transform.rotation = [0, Math.sin(frame / 1000), 0, Math.cos(frame / 1000)];
      const preview = engine.updateDrag(session, transform);
      expect(preview.ok).toBe(true); if (!preview.ok) return;
      session = preview.session;
    }
    expect(state.history).toHaveLength(0);
    expect(state.parts[root.id].transform).toEqual(root.initialTransform);
    const committed = engine.commitDrag(state, session);
    expect(committed.ok).toBe(true);
    expect(committed.state.history).toHaveLength(1);
    expect(committed.state.parts[root.id].transform).toEqual(session.transform);
    expect(engine.apply(committed.state, { type: 'UNDO' }).state.parts[root.id].transform).toEqual(root.initialTransform);
  });
  it('cancels a drag by discarding its preview and rejects invalid previews', () => {
    const engine = rules(), state = engine.createInitialState(), begin = engine.beginDrag(state, root.id);
    if (!begin.ok) throw new Error('begin failed');
    expect(engine.updateDrag(begin.session, root.targetTransform).ok).toBe(true);
    const bad = clone(root.targetTransform); bad.rotation = [0, 0, 0, 0];
    expect(engine.updateDrag(begin.session, bad)).toEqual({ ok: false, code: 'INVALID_TRANSFORM' });
    expect(state.parts[root.id].transform).toEqual(root.initialTransform);
    expect(state.history).toEqual([]);
  });
  it('rejects stale drags after other operations or a newly created state with the same revision', () => {
    const engine = rules(), state = engine.createInitialState(), begin = engine.beginDrag(state, root.id);
    if (!begin.ok) throw new Error('begin failed');
    const moved = place(engine, state, child);
    expect(engine.commitDrag(moved, begin.session)).toEqual({ ok: false, code: 'STALE_DRAG', state: moved });
    const replacement = engine.createInitialState();
    expect(engine.commitDrag(replacement, begin.session).ok).toBe(false);
  });
  it('prevents drags of installed, unknown or exploded pieces', () => {
    const engine = rules(), state = install(engine, engine.createInitialState(), root);
    expect(engine.beginDrag(state, root.id)).toEqual({ ok: false, code: 'PART_LOCKED' });
    expect(engine.beginDrag(state, 'unknown')).toEqual({ ok: false, code: 'UNKNOWN_PART' });
    const exploded = engine.apply(engine.createInitialState(), { type: 'SET_EXPLODED', exploded: true }).state;
    expect(engine.beginDrag(exploded, child.id).ok).toBe(false);
  });
  it('undoes installation before movement and reports an empty history', () => {
    const engine = rules(), state = install(engine, engine.createInitialState(), root);
    const first = engine.apply(state, { type: 'UNDO' }).state;
    expect(first.parts[root.id]).toEqual({ installed: false, transform: root.targetTransform });
    const second = engine.apply(first, { type: 'UNDO' }).state;
    expect(second.parts[root.id].transform).toEqual(root.initialTransform);
    const nothing = engine.apply(second, { type: 'UNDO' });
    expect(nothing.feedback?.code).toBe('NOTHING_TO_UNDO'); expect(nothing.state).toBe(second);
  });
  it('resets actual parts and progress, and allows undoing reset', () => {
    const engine = rules(), installed = install(engine, engine.createInitialState(), child);
    const reset = engine.apply(installed, { type: 'RESET' }).state;
    expect(reset.parts).toEqual(engine.createInitialState().parts);
    expect(engine.getProgress(reset).installedCount).toBe(0);
    const undone = engine.apply(reset, { type: 'UNDO' }).state;
    expect(undone.parts).toEqual(installed.parts);
    expect(engine.getProgress(undone).installedCount).toBe(2);
  });
  it('bounds history without affecting physical state', () => {
    const engine = createAssemblyRules(partDefinitions, [], { historyLimit: 2 });
    let state = engine.createInitialState();
    for (let i = 1; i <= 6; i++) { const t = clone(root.initialTransform); t.position[0] += i; state = place(engine, state, root, t); }
    expect(state.history).toHaveLength(2);
    state = engine.apply(engine.apply(state, { type: 'UNDO' }).state, { type: 'UNDO' }).state;
    expect(state.parts[root.id].transform.position[0]).toBe(root.initialTransform.position[0] + 4);
    expect(state.history).toEqual([]);
  });
});

describe('dependency-safe removal and derived progress', () => {
  it('blocks removal and includes transitive installed dependents; cancellation changes nothing', () => {
    const engine = rules(), state = install(engine, engine.createInitialState(), leaf);
    const blocked = engine.apply(state, { type: 'REMOVE_PART', partId: root.id });
    expect(blocked.feedback?.code).toBe('DEPENDENTS_INSTALLED');
    expect(blocked.feedback?.relatedPartIds).toEqual(expect.arrayContaining([middle.id, leaf.id]));
    expect(blocked.state).toBe(state);
  });
  it('atomically cascades only affected parts, preserves their positions, and undoes in one operation', () => {
    const engine = rules();
    let state = install(engine, engine.createInitialState(), leaf);
    const unaffected = partDefinitions.find(d => d.category === 'landing-gear')!;
    state = install(engine, state, unaffected);
    const before = deepFreeze(state);
    const removed = engine.remove(before, middle.id, true);
    expect(removed.feedback?.code).toBe('OK');
    for (const id of [middle.id, leaf.id]) {
      expect(removed.state.parts[id].installed).toBe(false);
      expect(removed.state.parts[id].transform).toEqual(before.parts[id].transform);
    }
    expect(removed.state.parts[root.id].installed).toBe(true);
    expect(removed.state.parts[unaffected.id].installed).toBe(true);
    expect(removed.state.history.length).toBe(before.history.length + 1);
    expect(engine.apply(removed.state, { type: 'UNDO' }).state.parts).toEqual(before.parts);
  });
  it('removes a leaf without confirmation and rejects removing an uninstalled piece', () => {
    const engine = rules(), empty = engine.createInitialState();
    const failed = engine.remove(empty, leaf.id, true);
    expect(failed.feedback?.code).toBe('NOT_INSTALLED'); expect(failed.state).toBe(empty);
    const state = install(engine, empty, leaf), removed = engine.remove(state, leaf.id);
    expect(removed.feedback?.ok).toBe(true);
    expect(removed.state.parts[leaf.id].installed).toBe(false);
    expect(removed.state.parts[middle.id].installed).toBe(true);
  });
  it('derives all available parts from dependencies, including parallel steps', () => {
    const engine = rules(), initial = engine.createInitialState();
    expect(engine.getProgress(initial)).toMatchObject({ installedCount: 0, fraction: 0, availablePartIds: [root.id], currentStepId: teachingSteps[0].id });
    const state = install(engine, initial, root), progress = engine.getProgress(state);
    expect(progress.installedCount).toBe(1);
    expect(progress.fraction).toBe(1 / partDefinitions.length);
    expect(progress.availablePartIds).toEqual(partDefinitions.filter(d => d.prerequisites.includes(root.id) && d.prerequisites.length === 1).map(d => d.id));
    expect(progress.steps[0].status).toBe('complete');
    expect(progress.steps.filter(s => s.status === 'available').length).toBeGreaterThan(1);
    const free = engine.apply(state, { type: 'SET_MODE', mode: 'free' }).state;
    expect(engine.getProgress(free).nextHint).toBe(null);
    expect(engine.getProgress(free).availablePartIds).toEqual(progress.availablePartIds);
  });
  it('updates available steps after disassembly and recomputes counts after undo', () => {
    const engine = rules(), state = install(engine, engine.createInitialState(), leaf);
    const removed = engine.remove(state, middle.id, true).state;
    expect(engine.getProgress(removed).installedCount).toBe(1);
    expect(engine.getProgress(removed).availablePartIds).toContain(middle.id);
    expect(engine.getProgress(removed).availablePartIds).not.toContain(leaf.id);
    expect(engine.getProgress(engine.apply(removed, { type: 'UNDO' }).state).installedCount).toBe(3);
  });
  it('treats an empty catalog as complete', () => {
    const engine = createAssemblyRules([]);
    expect(engine.getProgress(engine.createInitialState())).toMatchObject({ complete: true, fraction: 1, totalCount: 0 });
  });
});

describe('catalog sanity', () => {
  it('rejects duplicate ids, missing prerequisites, cycles and illegal tolerances', () => {
    expect(() => createAssemblyRules([...partDefinitions, root])).toThrow('INVALID_CATALOG');
    const missing = clone(partDefinitions); missing[0].prerequisites = ['absent'];
    expect(() => createAssemblyRules(missing)).toThrow('unknown prerequisite');
    const cycle = clone(partDefinitions); cycle.find(d => d.id === root.id)!.prerequisites = [child.id];
    expect(() => createAssemblyRules(cycle)).toThrow('cyclic prerequisite');
    const bad = clone(partDefinitions); bad[0].tolerances.position = NaN;
    expect(() => createAssemblyRules(bad)).toThrow('tolerance');
  });
  it('rejects invalid teaching steps and history limits', () => {
    const steps = clone(teachingSteps); steps[0].partIds = ['absent'];
    expect(() => createAssemblyRules(partDefinitions, steps)).toThrow('step');
    expect(() => createAssemblyRules(partDefinitions, [], { historyLimit: -1 })).toThrow('INVALID_HISTORY_LIMIT');
  });
  it('isolates copied rule definitions from caller edits', () => {
    const definitions = clone(partDefinitions), engine = createAssemblyRules(definitions);
    definitions[0].targetTransform.position[0] += 100;
    definitions[0].prerequisites.push('absent');
    expect(engine.checkInstall(place(engine, engine.createInitialState(), root), root.id).ok).toBe(true);
  });
});
