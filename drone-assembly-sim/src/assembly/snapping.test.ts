import { describe, expect, it } from 'vitest';
import type { AssemblyState, PartDefinition, Transform } from '../contracts';
import { partDefinitions } from '../data/parts';
import { createAssemblyRules } from './engine';
import { SNAP_RADIUS, snapEligibility } from './snapping';
import { magneticPlacementGuide } from '../scene/guidance';
const rules = createAssemblyRules(partDefinitions);
const frame = partDefinitions.find(p => p.id === 'FRAME-01')!;
const motor = partDefinitions.find(p => p.id === 'MOTOR-FL')!;
const clone = <T>(value: T): T => structuredClone(value);
const near = (part: PartDefinition, offset = SNAP_RADIUS / 2): Transform => ({ ...clone(part.targetTransform), position: [part.targetTransform.position[0] + offset, part.targetTransform.position[1], part.targetTransform.position[2]], rotation: [1, 0, 0, 0] });
function installPrerequisites(state: AssemblyState, part: PartDefinition): AssemblyState {
  for (const id of part.prerequisites) {
    if (state.parts[id].installed) continue;
    const parent = partDefinitions.find(p => p.id === id)!;
    state = installPrerequisites(state, parent);
    state = rules.apply(state, { type: 'PLACE_PART', partId: id, transform: clone(parent.targetTransform) }).state;
  }
  return state;
}
describe('magnetic released placement', () => {
  it.each(partDefinitions)('precisely aligns $id with prerequisites in one undoable action', part => {
    const before = installPrerequisites(rules.createInitialState(), part);
    const input = near(part);
    const original = clone(before);
    const result = rules.apply(before, { type: 'PLACE_PART', partId: part.id, transform: input });
    expect(result.feedback?.ok).toBe(true);
    expect(result.state.parts[part.id]).toEqual({ installed: true, transform: part.targetTransform });
    expect(result.state.history).toHaveLength(before.history.length + 1);
    expect(rules.apply(result.state, { type: 'UNDO' }).state.parts).toEqual(before.parts);
    expect(before).toEqual(original);
    input.position[0] += 1;
    expect(result.state.parts[part.id].transform).toEqual(part.targetTransform);
  });
  it('includes the boundary but excludes a meaningful amount outside it', () => {
    const initial = rules.createInitialState();
    expect(rules.apply(initial, { type: 'PLACE_PART', partId: frame.id, transform: near(frame, SNAP_RADIUS) }).state.parts[frame.id].installed).toBe(true);
    const outside = near(frame, SNAP_RADIUS + 0.00001);
    const result = rules.apply(initial, { type: 'PLACE_PART', partId: frame.id, transform: outside });
    expect(result.state.parts[frame.id]).toEqual({ installed: false, transform: outside });
  });
  it('uses three-dimensional distance, including height', () => {
    const t = clone(frame.targetTransform); t.position[1] += SNAP_RADIUS + 0.01;
    expect(snapEligibility(frame, rules.createInitialState(), t).canSnap).toBe(false);
  });
  it('keeps blocked placement loose and allows another release after prerequisites are installed', () => {
    const blocked = rules.apply(rules.createInitialState(), { type: 'PLACE_PART', partId: motor.id, transform: near(motor) }).state;
    expect(blocked.parts[motor.id].installed).toBe(false);
    expect(magneticPlacementGuide(motor, blocked).status).toBe('blocked');
    const ready = installPrerequisites(blocked, motor);
    expect(rules.apply(ready, { type: 'PLACE_PART', partId: motor.id, transform: near(motor) }).state.parts[motor.id].installed).toBe(true);
  });
  it('does not capture at a different motor target', () => {
    const state = installPrerequisites(rules.createInitialState(), motor);
    const other = partDefinitions.find(p => p.id === 'MOTOR-FR')!;
    const result = rules.apply(state, { type: 'PLACE_PART', partId: motor.id, transform: clone(other.targetTransform) });
    expect(result.state.parts[motor.id].installed).toBe(false);
  });
  it('does not auto-install on selection, view changes or undo', () => {
    const state = rules.apply(rules.createInitialState(), { type: 'SET_TRANSFORM', partId: frame.id, transform: near(frame) }).state;
    const selected = rules.apply(state, { type: 'SELECT_PART', partId: frame.id }).state;
    const viewed = rules.apply(selected, { type: 'SET_VIEW_PRESET', viewPreset: 'top' }).state;
    expect(viewed.parts[frame.id].installed).toBe(false);
    const installed = rules.apply(viewed, { type: 'PLACE_PART', partId: frame.id, transform: near(frame) }).state;
    expect(rules.apply(installed, { type: 'UNDO' }).state.parts[frame.id]).toEqual(viewed.parts[frame.id]);
  });
  it('rejects editing in exploded mode without history or transform changes', () => {
    const state = rules.apply(rules.createInitialState(), { type: 'SET_EXPLODED', exploded: true }).state;
    const result = rules.apply(state, { type: 'PLACE_PART', partId: frame.id, transform: near(frame) });
    expect(result.state).toBe(state); expect(result.feedback?.code).toBe('EXPLODED_VIEW_ACTIVE');
  });
  it('keeps an installed component locked', () => {
    const state = rules.apply(rules.createInitialState(), { type: 'PLACE_PART', partId: frame.id, transform: near(frame) }).state;
    const result = rules.apply(state, { type: 'PLACE_PART', partId: frame.id, transform: near(frame, 5) });
    expect(result.state).toBe(state); expect(result.feedback?.code).toBe('PART_LOCKED');
  });
  it('rejects non-finite transforms and does not capture incorrect scale', () => {
    const invalid = near(frame); invalid.position[1] = NaN;
    const state = rules.createInitialState();
    expect(rules.apply(state, { type: 'PLACE_PART', partId: frame.id, transform: invalid }).state).toBe(state);
    const scaled = near(frame); scaled.scale[0] = 2;
    expect(rules.apply(state, { type: 'PLACE_PART', partId: frame.id, transform: scaled }).state.parts[frame.id].installed).toBe(false);
    expect(magneticPlacementGuide(frame, state, scaled).status).toBe('scale');
  });
  it('gives the live magnetic hint the same capture decision as release', () => {
    const state = rules.createInitialState();
    for (const offset of [0, 0.8, SNAP_RADIUS, SNAP_RADIUS + 0.01, 4]) {
      const t = near(frame, offset);
      const guide = magneticPlacementGuide(frame, state, t);
      const installed = rules.apply(state, { type: 'PLACE_PART', partId: frame.id, transform: t }).state.parts[frame.id].installed;
      expect(guide.status === 'ready').toBe(installed);
    }
  });
  it('preserves exact snapped progress through the persistence validation', () => {
    const state = rules.apply(rules.createInitialState(), { type: 'PLACE_PART', partId: frame.id, transform: near(frame) }).state;
    expect(rules.restore(rules.serialize(state)).state?.parts[frame.id]).toEqual(state.parts[frame.id]);
  });
});
