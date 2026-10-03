import { describe, expect, it } from 'vitest';
import type { AssemblyState, PartDefinition, Quaternion, Transform } from '../contracts';
import { partDefinitions } from '../data/parts';
import { teachingSteps } from '../data/steps';
import { createAssemblyRules } from '../assembly';
import { guideTargets, placementGuide } from './guidance';
const rules = createAssemblyRules(partDefinitions);
const frame = partDefinitions[0];
describe('mounting guidance and rule agreement', () => {
  it('shows the initial mounting datum before a user selects anything', () => {
    expect(guideTargets(partDefinitions, teachingSteps, rules.createInitialState(), false).map(p => p.id)).toEqual(['FRAME-01']);
  });
  it('advances to the two skid sites after the frame is fitted, and includes an out-of-phase selection', () => {
    let state = rules.createInitialState();
    state = rules.apply(state, { type: 'SET_TRANSFORM', partId: frame.id, transform: frame.targetTransform }).state;
    state = rules.apply(state, { type: 'INSTALL_PART', partId: frame.id }).state;
    expect(guideTargets(partDefinitions, teachingSteps, state, false).map(p => p.id)).toEqual(['LEG-L', 'LEG-R']);
    state = rules.apply(state, { type: 'SELECT_PART', partId: 'BAT-01' }).state;
    expect(guideTargets(partDefinitions, teachingSteps, state, false).map(p => p.id)).toContain('BAT-01');
    expect(placementGuide(partDefinitions.find(p => p.id === 'BAT-01')!, state).missing).toEqual(['CTRL-01', 'LEG-L', 'LEG-R']);
  });
  it('never shows an occupied slot as available in the all-sites view', () => {
    const state = rules.createInitialState();
    state.parts[frame.id].installed = true;
    expect(guideTargets(partDefinitions, teachingSteps, state, true)).toHaveLength(16);
  });
  it('reports distance and orientation independently and agrees with installation readiness', () => {
    const state = rules.createInitialState();
    expect(placementGuide(frame, state).status).toBe('move');
    const rotated = { ...frame.targetTransform, rotation: [0, Math.sin(Math.PI/4), 0, Math.cos(Math.PI/4)] as [number,number,number,number] };
    expect(placementGuide(frame, state, rotated).status).toBe('rotate');
    state.parts[frame.id].transform = structuredClone(frame.targetTransform);
    expect(placementGuide(frame, state).status).toBe('ready');
    expect(rules.checkInstall(state, frame.id).ok).toBe(true);
    state.parts[frame.id].transform.position[0] += frame.tolerances.position + 0.001;
    expect(placementGuide(frame, state).positionOK).toBe(false);
    expect(rules.checkInstall(state, frame.id).ok).toBe(false);
  });
  it('does not invite installation with wrong scale or while explosion mode is for inspection', () => {
    const state = rules.createInitialState();
    state.parts[frame.id].transform = structuredClone(frame.targetTransform);
    state.parts[frame.id].transform.scale[0] = 2;
    expect(placementGuide(frame, state).status).toBe('scale');
    state.exploded = true;
    expect(placementGuide(frame, state).status).toBe('inspection');
  });
  it('treats opposite quaternion signs as the same orientation', () => {
    const state = rules.createInitialState();
    const transform = structuredClone(frame.targetTransform);
    transform.rotation = transform.rotation.map(n => -n) as [number,number,number,number];
    expect(placementGuide(frame, state, transform).angle).toBe(0);
  });
});

// Compare user-facing readiness with the public rule API, not its private math helpers.
const clone = <T>(value: T): T => structuredClone(value);
const basePart = partDefinitions.find(part => part.prerequisites.length === 0)!;

function installPrerequisites(state: AssemblyState, part: PartDefinition): AssemblyState {
  for (const id of part.prerequisites) {
    if (state.parts[id].installed) continue;
    const prerequisite = partDefinitions.find(definition => definition.id === id)!;
    state = installPrerequisites(state, prerequisite);
    state = rules.apply(state, { type: 'SET_TRANSFORM', partId: id, transform: prerequisite.targetTransform }).state;
    const installed = rules.apply(state, { type: 'INSTALL_PART', partId: id });
    expect(installed.feedback?.ok, id).toBe(true);
    state = installed.state;
  }
  return state;
}

function candidate(part = basePart, transform: Transform = part.targetTransform): AssemblyState {
  const state = installPrerequisites(rules.createInitialState(), part);
  return { ...state, parts: { ...state.parts, [part.id]: { installed: false, transform: clone(transform) } } };
}

describe('readiness cannot promise installation that the rule engine rejects', () => {
  it('agrees for every catalog part at its target with satisfied prerequisites', () => {
    for (const part of partDefinitions) {
      const state = candidate(part);
      expect(placementGuide(part, state).status, part.id).toBe('ready');
      expect(rules.checkInstall(state, part.id).ok, part.id).toBe(true);
      const installed = rules.apply(state, { type: 'INSTALL_PART', partId: part.id });
      expect(installed.feedback?.ok, part.id).toBe(true);
      expect(installed.state.parts[part.id].transform, part.id).toEqual(part.targetTransform);
    }
  });

  it('agrees for opposite quaternion signs on every current target', () => {
    for (const part of partDefinitions) {
      const transform = clone(part.targetTransform);
      transform.rotation = transform.rotation.map(value => -value) as Quaternion;
      const state = candidate(part, transform);
      expect(placementGuide(part, state).status, part.id).toBe('ready');
      expect(rules.checkInstall(state, part.id).ok, part.id).toBe(true);
    }
  });

  it('rejects a scale difference accepted by the former loose guidance threshold', () => {
    const state = candidate();
    state.parts[basePart.id].transform.scale[0] += 5e-7;
    expect(rules.checkInstall(state, basePart.id).code).toBe('SCALE_MISMATCH');
    const guidance = placementGuide(basePart, state);
    expect(guidance.scaleOK).toBe(false);
    expect(guidance.status).toBe('scale');
  });

  it('checks the supplied live preview rather than the last committed pose', () => {
    const state = candidate();
    const preview = clone(basePart.targetTransform);
    preview.scale[0] += 5e-7;
    expect(rules.checkInstall(candidate(basePart, preview), basePart.id).code).toBe('SCALE_MISMATCH');
    expect(placementGuide(basePart, state, preview).status).not.toBe('ready');
    expect(state.parts[basePart.id].transform).toEqual(basePart.targetTransform);
  });

  it('changes a ready committed pose to move when the user drags a live preview away', () => {
    const state = candidate(), preview = clone(basePart.targetTransform);
    preview.position[0] += basePart.tolerances.position * 2;
    expect(placementGuide(basePart, state).status).toBe('ready');
    expect(rules.checkInstall(state, basePart.id).ok).toBe(true);
    expect(placementGuide(basePart, state, preview).status).toBe('move');
    expect(rules.checkInstall(candidate(basePart, preview), basePart.id).code).toBe('POSITION_OUT_OF_TOLERANCE');
  });

  it('changes a ready committed pose to rotate when only the live orientation goes outside tolerance', () => {
    const state = candidate(), preview = clone(basePart.targetTransform);
    preview.rotation = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
    expect(placementGuide(basePart, state).status).toBe('ready');
    expect(placementGuide(basePart, state, preview).status).toBe('rotate');
    expect(rules.checkInstall(candidate(basePart, preview), basePart.id).code).toBe('ANGLE_OUT_OF_TOLERANCE');
  });

  it('rejects positions outside the spherical tolerance even when each axis is inside', () => {
    const state = candidate();
    state.parts[basePart.id].transform.position[0] += basePart.tolerances.position * 0.8;
    state.parts[basePart.id].transform.position[2] += basePart.tolerances.position * 0.8;
    expect(rules.checkInstall(state, basePart.id).code).toBe('POSITION_OUT_OF_TOLERANCE');
    expect(placementGuide(basePart, state).status).toBe('move');
  });

  it.each([-1, 1])('includes exact distance boundaries in the shared catalog (side %s)', direction => {
    for (const part of partDefinitions) {
      const transform = clone(part.targetTransform);
      transform.position[0] += direction * part.tolerances.position;
      const state = candidate(part, transform);
      expect(rules.checkInstall(state, part.id).ok, part.id).toBe(true);
      expect(placementGuide(part, state).positionOK, part.id).toBe(true);
      expect(placementGuide(part, state).status, part.id).toBe('ready');
    }
  });

  it('accepts the rule-approved floating-point rounding margin at a distance boundary', () => {
    const state = candidate();
    state.parts[basePart.id].transform.position[0] += basePart.tolerances.position + 8 * Number.EPSILON;
    expect(rules.checkInstall(state, basePart.id).ok).toBe(true);
    expect(placementGuide(basePart, state).positionOK).toBe(true);
    expect(placementGuide(basePart, state).status).toBe('ready');
  });

  it('rejects a measurable displacement beyond the distance tolerance', () => {
    const state = candidate();
    state.parts[basePart.id].transform.position[0] += basePart.tolerances.position + 1e-8;
    expect(rules.checkInstall(state, basePart.id).code).toBe('POSITION_OUT_OF_TOLERANCE');
    expect(placementGuide(basePart, state).positionOK).toBe(false);
    expect(placementGuide(basePart, state).status).toBe('move');
  });

  it.each([-1, 0, 1])('agrees just inside, at, and outside the angular boundary (%s)', offset => {
    const transform = clone(basePart.targetTransform);
    const angle = basePart.tolerances.angleRadians + offset * 1e-8;
    transform.rotation = [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];
    const state = candidate(basePart, transform);
    const check = rules.checkInstall(state, basePart.id);
    expect(check.code).toBe(offset > 0 ? 'ANGLE_OUT_OF_TOLERANCE' : 'OK');
    const guidance = placementGuide(basePart, state);
    expect(guidance.angle).toBeCloseTo(angle, 12);
    expect(guidance.status).toBe(offset > 0 ? 'rotate' : 'ready');
  });

  it('accepts the rule-approved rounding margin at the angular boundary', () => {
    const angle = basePart.tolerances.angleRadians + 8 * Number.EPSILON;
    const transform = clone(basePart.targetTransform);
    transform.rotation = [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];
    const state = candidate(basePart, transform);
    expect(rules.checkInstall(state, basePart.id).ok).toBe(true);
    expect(placementGuide(basePart, state).status).toBe('ready');
  });

  it('resolves equivalent signs and a known angular error about a nonidentity target', () => {
    const definitions = clone(partDefinitions), part = definitions.find(definition => definition.id === basePart.id)!;
    const half = Math.PI / 4;
    part.targetTransform.rotation = [0, 0, Math.sin(half), Math.cos(half)];
    const customRules = createAssemblyRules(definitions);
    const state = customRules.createInitialState();
    const opposite = clone(part.targetTransform);
    opposite.rotation = opposite.rotation.map(value => -value) as Quaternion;
    state.parts[part.id].transform = opposite;
    expect(customRules.checkInstall(state, part.id).ok).toBe(true);
    expect(placementGuide(part, state).status).toBe('ready');
    state.parts[part.id].transform.rotation = [0, 0, 0, 1];
    expect(customRules.checkInstall(state, part.id).code).toBe('ANGLE_OUT_OF_TOLERANCE');
    expect(placementGuide(part, state).angle).toBeCloseTo(Math.PI / 2, 12);
    expect(placementGuide(part, state).status).toBe('rotate');
  });

  it('does not erase a small real rotation when a valid catalog requests zero angle tolerance', () => {
    const definitions = clone(partDefinitions), part = definitions.find(definition => definition.id === basePart.id)!;
    part.tolerances.angleRadians = 0;
    const customRules = createAssemblyRules(definitions), state = customRules.createInitialState();
    state.parts[part.id].transform = clone(part.targetTransform);
    state.parts[part.id].transform.rotation = [Math.sin(1e-8 / 2), 0, 0, Math.cos(1e-8 / 2)];
    expect(customRules.checkInstall(state, part.id).code).toBe('ANGLE_OUT_OF_TOLERANCE');
    expect(placementGuide(part, state).status).not.toBe('ready');
  });

  const malformed: [string, (transform: Transform) => void][] = [
    ['nonunit quaternion', transform => { transform.rotation = [0, 0, 0, 2]; }],
    ['quaternion beyond unit-rounding allowance', transform => { transform.rotation = [0, 0, 0, 1 + 2e-6]; }],
    ['zero quaternion', transform => { transform.rotation = [0, 0, 0, 0]; }],
    ['short position tuple', transform => { transform.position = transform.position.slice(0, 2) as Transform['position']; }],
    ['short scale tuple', transform => { transform.scale = [1, 1] as unknown as Transform['scale']; }],
    ['sparse scale tuple', transform => { transform.scale = Array(3) as Transform['scale']; }],
    ['NaN position', transform => { transform.position[0] = NaN; }],
    ['infinite rotation', transform => { transform.rotation[0] = Infinity; }],
    ['zero scale', transform => { transform.scale[0] = 0; }],
    ['negative scale', transform => { transform.scale[0] = -1; }],
  ];
  it.each(malformed)('never advertises readiness for a rejected preview: %s', (_label, mutate) => {
    const state = candidate();
    mutate(state.parts[basePart.id].transform);
    expect(rules.checkInstall(state, basePart.id).code).toBe('INVALID_TRANSFORM');
    expect(placementGuide(basePart, state).status).not.toBe('ready');
  });

  it('preserves readiness under an allowed small quaternion normalization error', () => {
    const state = candidate();
    state.parts[basePart.id].transform.rotation[3] += 5e-7;
    expect(rules.checkInstall(state, basePart.id).ok).toBe(true);
    expect(placementGuide(basePart, state).status).toBe('ready');
  });

  it('prioritizes a scale mismatch over simultaneous position and rotation errors like the rules', () => {
    const state = candidate();
    state.parts[basePart.id].transform.scale[0] = 2;
    state.parts[basePart.id].transform.position[0] += basePart.tolerances.position * 2;
    state.parts[basePart.id].transform.rotation = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
    expect(rules.checkInstall(state, basePart.id).code).toBe('SCALE_MISMATCH');
    expect(placementGuide(basePart, state).status).toBe('scale');
  });

  it('prioritizes missing prerequisites over an otherwise valid but wrong scale', () => {
    const part = partDefinitions.find(definition => definition.prerequisites.length > 0)!;
    const state = rules.createInitialState();
    state.parts[part.id].transform = clone(part.targetTransform);
    state.parts[part.id].transform.scale[0] = 2;
    expect(rules.checkInstall(state, part.id).code).toBe('MISSING_PREREQUISITES');
    expect(placementGuide(part, state).status).toBe('blocked');
  });

  it('classifies an invalid transform before a missing prerequisite', () => {
    const part = partDefinitions.find(definition => definition.prerequisites.length > 0)!;
    const state = rules.createInitialState();
    state.parts[part.id].transform = clone(part.targetTransform);
    state.parts[part.id].transform.rotation = [0, 0, 0, 2];
    expect(rules.checkInstall(state, part.id).code).toBe('INVALID_TRANSFORM');
    expect(placementGuide(part, state).status).toBe('invalid');
  });

  it('gives consistent blocked prerequisites regardless of guided/free mode', () => {
    const part = partDefinitions.find(definition => definition.prerequisites.length > 1)!;
    for (const mode of ['guided', 'free'] as const) {
      const state = rules.createInitialState(); state.mode = mode;
      state.parts[part.id].transform = clone(part.targetTransform);
      const check = rules.checkInstall(state, part.id), guidance = placementGuide(part, state);
      expect(check.code).toBe('MISSING_PREREQUISITES');
      expect(guidance.status).toBe('blocked');
      expect(guidance.missing).toEqual(check.relatedPartIds);
      expect(guidance.missing).toEqual(part.prerequisites);
    }
  });

  it('updates the missing list when only some prerequisites are fitted', () => {
    const part = partDefinitions.find(definition => definition.prerequisites.length > 1)!;
    const state = candidate(part);
    const missingId = part.prerequisites.find(id => !partDefinitions.some(definition => definition.prerequisites.includes(id))) ?? part.prerequisites.at(-1)!;
    // Detaching a prerequisite in this candidate leaves the target uninstalled.
    state.parts[missingId].installed = false;
    const check = rules.checkInstall(state, part.id), guidance = placementGuide(part, state);
    expect(check.code).toBe('MISSING_PREREQUISITES');
    expect(guidance.status).toBe('blocked');
    expect(guidance.missing).toEqual([missingId]);
  });

  it('reports fitted pieces as installed rather than reusable green mounting sites', () => {
    const state = candidate(), fitted = rules.apply(state, { type: 'INSTALL_PART', partId: basePart.id }).state;
    expect(rules.checkInstall(fitted, basePart.id).code).toBe('ALREADY_INSTALLED');
    expect(placementGuide(basePart, fitted).status).toBe('installed');
    fitted.exploded = true;
    expect(placementGuide(basePart, fitted).status).toBe('installed');
  });

  it('suppresses installation invitations in explosion mode without changing assembly truth', () => {
    const state = candidate(); state.exploded = true;
    const before = clone(state);
    expect(rules.checkInstall(state, basePart.id).ok).toBe(true);
    expect(placementGuide(basePart, state).status).toBe('inspection');
    expect(placementGuide(basePart, state).positionOK).toBe(true);
    expect(state).toEqual(before);
    expect(rules.apply(state, { type: 'SET_TRANSFORM', partId: basePart.id, transform: basePart.initialTransform }).feedback?.code).toBe('EXPLODED_VIEW_ACTIVE');
  });

  it('does not mutate the shared definition, the state, or a preview during inspection', () => {
    const state = candidate(), preview = clone(basePart.targetTransform);
    const before = { part: clone(basePart), state: clone(state), preview: clone(preview) };
    placementGuide(basePart, state, preview);
    guideTargets(partDefinitions, teachingSteps, state, true);
    expect(basePart).toEqual(before.part); expect(state).toEqual(before.state); expect(preview).toEqual(before.preview);
  });
});

describe('target selection follows catalog state rather than a separate progress counter', () => {
  it('preserves an explicitly selected fitted part for inspection, not as an available slot', () => {
    let state = candidate();
    state = rules.apply(state, { type: 'INSTALL_PART', partId: basePart.id }).state;
    state = rules.apply(state, { type: 'SELECT_PART', partId: basePart.id }).state;
    const visible = guideTargets(partDefinitions, teachingSteps, state, true);
    expect(visible.filter(part => part.id === basePart.id)).toHaveLength(1);
    expect(placementGuide(basePart, state).status).toBe('installed');
  });

  it('returns shared target definitions even for an out-of-phase selection', () => {
    const selected = partDefinitions.find(part => part.prerequisites.length > 1)!;
    const state = rules.apply(rules.createInitialState(), { type: 'SELECT_PART', partId: selected.id }).state;
    const visible = guideTargets(partDefinitions, teachingSteps, state, false);
    expect(visible).toContain(basePart); expect(visible).toContain(selected);
    expect(new Set(visible.map(part => part.id)).size).toBe(visible.length);
    expect(visible.find(part => part.id === selected.id)).toBe(selected);
    expect(placementGuide(selected, state).status).toBe('blocked');
  });

  it('has no available targets after actual complete assembly, while keeping a selected inspection target', () => {
    let state = rules.createInitialState();
    for (const part of partDefinitions) {
      state = installPrerequisites(state, part);
      if (!state.parts[part.id].installed) {
        state = rules.apply(state, { type: 'SET_TRANSFORM', partId: part.id, transform: part.targetTransform }).state;
        state = rules.apply(state, { type: 'INSTALL_PART', partId: part.id }).state;
      }
    }
    expect(guideTargets(partDefinitions, teachingSteps, state, false)).toEqual([]);
    expect(guideTargets(partDefinitions, teachingSteps, state, true)).toEqual([]);
    state = rules.apply(state, { type: 'SELECT_PART', partId: basePart.id }).state;
    expect(guideTargets(partDefinitions, teachingSteps, state, false)).toEqual([basePart]);
    expect(placementGuide(basePart, state).status).toBe('installed');
  });

  it('updates current-phase targets after reset and its undo', () => {
    let state = candidate();
    state = rules.apply(state, { type: 'INSTALL_PART', partId: basePart.id }).state;
    const expected = guideTargets(partDefinitions, teachingSteps, state, false).map(part => part.id);
    const reset = rules.apply(state, { type: 'RESET' }).state;
    expect(guideTargets(partDefinitions, teachingSteps, reset, false)).toEqual([basePart]);
    const restored = rules.apply(reset, { type: 'UNDO' }).state;
    expect(guideTargets(partDefinitions, teachingSteps, restored, false).map(part => part.id)).toEqual(expected);
  });
});
