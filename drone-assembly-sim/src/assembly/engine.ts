import type { AssemblyAction, AssemblySnapshot, AssemblyState, AssemblyTransition, InstallationCheckResult, PartDefinition, PartId, TeachingStep } from '../contracts';
import { cloneSnapshot, createCatalog } from './catalog';
import { cloneTransform, equalScale, isValidTransform, positionDistance, quaternionAngle, sameTransform, withinTolerance } from './math';
import { createPersistence } from './serialization';
import type { AssemblyEngine, DetailedCheckResult, DragSession, SlotCheckResult } from './types';

export interface EngineOptions { historyLimit?: number }

/** Inject the shared catalog; no rendering, UI, storage, or real aircraft assumptions. */
export function createAssemblyRules(definitions: readonly PartDefinition[], steps: readonly TeachingStep[] = [], options: EngineOptions = {}): AssemblyEngine {
  const catalog = createCatalog(definitions, steps);
  const historyLimit = options.historyLimit ?? 100;
  if (!Number.isSafeInteger(historyLimit) || historyLimit < 0) throw new Error('INVALID_HISTORY_LIMIT');
  const result = (partId: PartId, code: InstallationCheckResult['code'], details: Partial<DetailedCheckResult> = {}): DetailedCheckResult => ({ ...details, ok: code === 'OK', code, partId });
  const hasPart = (state: AssemblyState, id: PartId) => catalog.byId.has(id) && Object.hasOwn(state.parts, id);

  function createInitialState(): AssemblyState {
    return {
      schemaVersion: 1, revision: 0, history: [], selectedPartId: null, mode: 'guided', exploded: false, interactionMode: 'translate', viewPreset: 'perspective',
      parts: Object.fromEntries(catalog.definitions.map(d => [d.id, { transform: cloneTransform(d.initialTransform), installed: false }])),
    };
  }
  function record(state: AssemblyState, next: AssemblySnapshot): AssemblyState {
    const history = historyLimit ? [...state.history, cloneSnapshot(state)].slice(-historyLimit) : [];
    return { ...next, schemaVersion: 1, revision: state.revision + 1, history };
  }
  function checkInstall(state: AssemblyState, partId: PartId): DetailedCheckResult {
    if (!hasPart(state, partId)) return result(partId, 'UNKNOWN_PART');
    const d = catalog.byId.get(partId)!;
    const p = state.parts[partId];
    if (p.installed) return result(partId, 'ALREADY_INSTALLED');
    if (!isValidTransform(p.transform)) return result(partId, 'INVALID_TRANSFORM');
    const missing = d.prerequisites.filter(id => !state.parts[id]?.installed);
    if (missing.length) return result(partId, 'MISSING_PREREQUISITES', { relatedPartIds: missing });
    if (!equalScale(p.transform, d.targetTransform)) return result(partId, 'SCALE_MISMATCH', { expectedScale: [...d.targetTransform.scale], actualScale: [...p.transform.scale] });
    const errors = { positionError: positionDistance(p.transform, d.targetTransform), angleErrorRadians: quaternionAngle(p.transform.rotation, d.targetTransform.rotation), positionTolerance: d.tolerances.position, angleToleranceRadians: d.tolerances.angleRadians };
    if (!withinTolerance(errors.positionError, d.tolerances.position)) return result(partId, 'POSITION_OUT_OF_TOLERANCE', errors);
    if (!withinTolerance(errors.angleErrorRadians, d.tolerances.angleRadians)) return result(partId, 'ANGLE_OUT_OF_TOLERANCE', errors);
    return result(partId, 'OK', errors);
  }
  function checkSlot(state: AssemblyState, partId: PartId, slotId: PartId): SlotCheckResult {
    if (!hasPart(state, partId)) return result(partId, 'UNKNOWN_PART');
    if (slotId !== partId) return { ok: false, code: 'WRONG_SLOT', partId, slotId, expectedSlotId: partId };
    return checkInstall(state, partId);
  }
  function installedDependents(state: AssemblyState, partId: PartId): PartId[] {
    const affected = new Set([partId]);
    let added = true;
    while (added) {
      added = false;
      for (const d of catalog.definitions) {
        if (state.parts[d.id]?.installed && !affected.has(d.id) && d.prerequisites.some(id => affected.has(id))) {
          affected.add(d.id); added = true;
        }
      }
    }
    return catalog.definitions.filter(d => d.id !== partId && affected.has(d.id)).map(d => d.id);
  }
  function checkRemoval(state: AssemblyState, partId: PartId): DetailedCheckResult {
    if (!hasPart(state, partId)) return result(partId, 'UNKNOWN_PART');
    if (!state.parts[partId].installed) return result(partId, 'NOT_INSTALLED');
    const dependents = installedDependents(state, partId);
    return dependents.length ? result(partId, 'DEPENDENTS_INSTALLED', { relatedPartIds: dependents }) : result(partId, 'OK');
  }
  function remove(state: AssemblyState, partId: PartId, cascade = false): AssemblyTransition {
    const feedback = checkRemoval(state, partId);
    if (!feedback.ok && !(cascade && feedback.code === 'DEPENDENTS_INSTALLED')) return { state, feedback };
    const parts = { ...state.parts };
    for (const id of [partId, ...(feedback.relatedPartIds ?? [])]) {
      // Detached components remain at their installed position, ready to move.
      parts[id] = { installed: false, transform: cloneTransform(state.parts[id].transform) };
    }
    return { state: record(state, { ...cloneSnapshot(state), parts }), feedback: result(partId, 'OK', { relatedPartIds: feedback.relatedPartIds }) };
  }
  function installAt(state: AssemblyState, partId: PartId, slotId: PartId) {
    const feedback = checkSlot(state, partId, slotId);
    if (!feedback.ok) return { state, feedback };
    const parts = { ...state.parts, [partId]: { installed: true, transform: cloneTransform(catalog.byId.get(partId)!.targetTransform) } };
    return { state: record(state, { ...cloneSnapshot(state), parts }), feedback };
  }
  function apply(state: AssemblyState, action: AssemblyAction): AssemblyTransition {
    switch (action.type) {
      case 'SELECT_PART':
        if (action.partId !== null && !hasPart(state, action.partId)) return { state, feedback: result(action.partId, 'UNKNOWN_PART') };
        return action.partId === state.selectedPartId ? { state } : { state: { ...state, selectedPartId: action.partId, revision: state.revision + 1 } };
      case 'SET_TRANSFORM': {
        if (!hasPart(state, action.partId)) return { state, feedback: result(action.partId, 'UNKNOWN_PART') };
        if (state.parts[action.partId].installed) return { state, feedback: result(action.partId, 'PART_LOCKED') };
        if (state.exploded) return { state, feedback: result(action.partId, 'EXPLODED_VIEW_ACTIVE') };
        if (!isValidTransform(action.transform)) return { state, feedback: result(action.partId, 'INVALID_TRANSFORM') };
        if (sameTransform(state.parts[action.partId].transform, action.transform)) return { state };
        const parts = { ...state.parts, [action.partId]: { installed: false, transform: cloneTransform(action.transform) } };
        return { state: record(state, { ...cloneSnapshot(state), parts }) };
      }
      case 'INSTALL_PART': {
        const feedback = checkInstall(state, action.partId);
        if (!feedback.ok) return { state, feedback };
        const parts = { ...state.parts, [action.partId]: { installed: true, transform: cloneTransform(catalog.byId.get(action.partId)!.targetTransform) } };
        return { state: record(state, { ...cloneSnapshot(state), parts }), feedback };
      }
      case 'REMOVE_PART': return remove(state, action.partId);
      case 'UNDO': {
        const previous = state.history.at(-1);
        if (!previous) return { state, feedback: result(state.selectedPartId ?? '', 'NOTHING_TO_UNDO') };
        return { state: { ...cloneSnapshot(previous), mode: state.mode, exploded: state.exploded, interactionMode: state.interactionMode, viewPreset: state.viewPreset, schemaVersion: 1, revision: state.revision + 1, history: state.history.slice(0, -1) } };
      }
      case 'RESET': {
        const initial = createInitialState();
        if (JSON.stringify(cloneSnapshot(state)) === JSON.stringify(cloneSnapshot(initial))) return { state };
        return { state: record(state, cloneSnapshot(initial)) };
      }
      case 'SET_MODE':
        if (!['guided', 'free'].includes(action.mode) || state.mode === action.mode) return { state };
        return { state: { ...state, mode: action.mode, revision: state.revision + 1 } };
      case 'SET_EXPLODED':
        if (typeof action.exploded !== 'boolean' || state.exploded === action.exploded) return { state };
        return { state: { ...state, exploded: action.exploded, revision: state.revision + 1 } };
      case 'SET_INTERACTION_MODE':
        if (!['translate', 'rotate'].includes(action.interactionMode) || state.interactionMode === action.interactionMode) return { state };
        return { state: { ...state, interactionMode: action.interactionMode, revision: state.revision + 1 } };
      case 'SET_VIEW_PRESET':
        if (!['perspective', 'top', 'front', 'side'].includes(action.viewPreset) || state.viewPreset === action.viewPreset) return { state };
        return { state: { ...state, viewPreset: action.viewPreset, revision: state.revision + 1 } };
    }
  }
  function getProgress(state: AssemblyState): ReturnType<AssemblyEngine['getProgress']> {
    const installedCount = catalog.definitions.filter(d => state.parts[d.id].installed).length;
    const availablePartIds = catalog.definitions.filter(d => !state.parts[d.id].installed && d.prerequisites.every(id => state.parts[id].installed)).map(d => d.id);
    const available = new Set(availablePartIds);
    const stepProgress = catalog.steps.map(step => {
      const remainingPartIds = step.partIds.filter(id => !state.parts[id].installed);
      const availableIds = remainingPartIds.filter(id => available.has(id));
      return { step: { ...step, partIds: [...step.partIds] }, status: !remainingPartIds.length ? 'complete' as const : availableIds.length ? 'available' as const : 'blocked' as const,
        installedPartIds: step.partIds.filter(id => state.parts[id].installed), remainingPartIds, availablePartIds: availableIds };
    });
    const currentStep = stepProgress.find(step => step.status === 'available');
    const nextPart = currentStep?.availablePartIds[0] ?? availablePartIds[0];
    const complete = installedCount === catalog.definitions.length;
    return { installedCount, totalCount: catalog.definitions.length, fraction: catalog.definitions.length ? installedCount / catalog.definitions.length : 1, complete, availablePartIds, steps: stepProgress, currentStepId: currentStep?.step.id ?? null,
      nextHint: state.mode === 'free' ? null : complete ? { code: 'ASSEMBLY_COMPLETE' } : nextPart ? { code: 'INSTALL_AVAILABLE_PART', partId: nextPart, stepId: currentStep?.step.id, text: currentStep?.step.hint, textEn: currentStep?.step.hintEn } : null };
  }
  function beginDrag(state: AssemblyState, partId: PartId): ReturnType<AssemblyEngine['beginDrag']> {
    if (!hasPart(state, partId)) return { ok: false, code: 'UNKNOWN_PART' };
    if (state.parts[partId].installed || state.exploded) return { ok: false, code: 'PART_LOCKED' };
    return { ok: true, session: { partId, baseState: state, transform: cloneTransform(state.parts[partId].transform) } };
  }
  function updateDrag(session: DragSession, transform: DragSession['transform']): ReturnType<AssemblyEngine['updateDrag']> {
    if (!hasPart(session.baseState, session.partId)) return { ok: false, code: 'UNKNOWN_PART' };
    if (session.baseState.parts[session.partId].installed || session.baseState.exploded) return { ok: false, code: 'PART_LOCKED' };
    if (!isValidTransform(transform)) return { ok: false, code: 'INVALID_TRANSFORM' };
    return { ok: true, session: { ...session, transform: cloneTransform(transform) } };
  }
  function commitDrag(state: AssemblyState, session: DragSession): ReturnType<AssemblyEngine['commitDrag']> {
    // Object identity also prevents stale commits after reset/reload with the same revision.
    if (state !== session.baseState) return { ok: false, state, code: 'STALE_DRAG' };
    const transition = apply(state, { type: 'SET_TRANSFORM', partId: session.partId, transform: session.transform });
    if (transition.feedback && !transition.feedback.ok) return { ok: false, state, code: transition.feedback.code === 'UNKNOWN_PART' ? 'UNKNOWN_PART' : transition.feedback.code === 'INVALID_TRANSFORM' ? 'INVALID_TRANSFORM' : 'PART_LOCKED' };
    return { ok: true, state: transition.state };
  }
  return { createInitialState, checkInstall, checkSlot, checkRemoval, installAt, remove, apply, getProgress, beginDrag, updateDrag, commitDrag, ...createPersistence(catalog, createInitialState) };
}

export const createAssemblyEngine = createAssemblyRules;
