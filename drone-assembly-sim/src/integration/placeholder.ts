import type { AssemblyRules, AssemblyState, SceneAdapterFactory } from '../contracts';
const copy = <T,>(value: T): T => structuredClone(value);
/** Temporary scaffold only; production integration replaces both factories. */
export const createPlaceholderRules = (definitions: readonly import('../contracts').PartDefinition[]): AssemblyRules => {
  const createInitialState = (): AssemblyState => ({ schemaVersion: 1, parts: Object.fromEntries(definitions.map(p => [p.id, { transform: copy(p.initialTransform), installed: false }])), selectedPartId: null, mode: 'guided', exploded: false, interactionMode: 'translate', viewPreset: 'perspective', history: [], revision: 0 });
  const unavailable = (_state: AssemblyState, partId: string) => ({ ok: false, code: 'POSITION_OUT_OF_TOLERANCE' as const, partId });
  return { createInitialState, checkInstall: unavailable, checkRemoval: unavailable, apply(state, action) {
    const next = copy(state);
    switch (action.type) {
      case 'SELECT_PART': next.selectedPartId = action.partId; break;
      case 'SET_TRANSFORM': if (next.parts[action.partId]) next.parts[action.partId].transform = copy(action.transform); break;
      case 'SET_MODE': next.mode = action.mode; break;
      case 'SET_EXPLODED': next.exploded = action.exploded; break;
      case 'SET_VIEW_PRESET': next.viewPreset = action.viewPreset; break;
      case 'SET_INTERACTION_MODE': next.interactionMode = action.interactionMode; break;
      case 'RESET': return { state: createInitialState() };
      case 'UNDO': return { state, feedback: { ok: false, code: 'NOTHING_TO_UNDO', partId: '' } };
      case 'INSTALL_PART': case 'REMOVE_PART': return { state, feedback: unavailable(state, action.partId) };
    }
    next.revision++;
    return { state: next };
  } };
};
export const createPlaceholderSceneAdapter: SceneAdapterFactory = ({ container }) => {
  const message = document.createElement('div'); message.className = 'scene-placeholder';
  message.textContent = '3D scene integration in progress / 3D 场景集成中'; container.append(message);
  return { update() {}, resize() {}, dispose() { message.remove(); } };
};
