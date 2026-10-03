/** Contract v1. Y-up, right-handed; teaching units, NOT real dimensions. */
export type PartId = string;
export type Vector3 = [number, number, number];
/** Quaternion order [x, y, z, w], unit length. All angle tolerances are radians. */
export type Quaternion = [number, number, number, number];
export interface Transform { position: Vector3; rotation: Quaternion; scale: Vector3 }
export type PartCategory = 'frame' | 'landing-gear' | 'power' | 'propeller' | 'guard' | 'control' | 'battery';
export type GeometryKind = 'frame' | 'landing-gear' | 'motor' | 'propeller' | 'guard' | 'controller' | 'battery';
export interface SimplifiedGeometry { kind: GeometryKind; size: Vector3; color: string; radius?: number }
export interface PartDefinition {
  id: PartId;
  name: string;
  nameEn: string;
  category: PartCategory;
  referenceFiles: string[];
  geometry: SimplifiedGeometry;
  initialTransform: Transform;
  targetTransform: Transform;
  prerequisites: PartId[];
  tolerances: { position: number; angleRadians: number };
  assumption: string;
  explosionOffset: Vector3;
}
export interface PartState { transform: Transform; installed: boolean }
export type AssemblyMode = 'guided' | 'free';
export type InteractionMode = 'translate' | 'rotate';
export type ViewPreset = 'perspective' | 'top' | 'front' | 'side';
export interface AssemblySnapshot {
  parts: Record<PartId, PartState>;
  selectedPartId: PartId | null;
  mode: AssemblyMode;
  exploded: boolean;
  interactionMode: InteractionMode;
  viewPreset: ViewPreset;
}
export interface AssemblyState extends AssemblySnapshot { schemaVersion: 1; history: AssemblySnapshot[]; revision: number }
export type AssemblyErrorCode = 'OK' | 'UNKNOWN_PART' | 'ALREADY_INSTALLED' | 'NOT_INSTALLED' | 'MISSING_PREREQUISITES' | 'POSITION_OUT_OF_TOLERANCE' | 'ANGLE_OUT_OF_TOLERANCE' | 'SCALE_MISMATCH' | 'DEPENDENTS_INSTALLED' | 'INVALID_TRANSFORM' | 'PART_LOCKED' | 'EXPLODED_VIEW_ACTIVE' | 'NOTHING_TO_UNDO';
export interface InstallationCheckResult {
  ok: boolean;
  code: AssemblyErrorCode;
  partId: PartId;
  relatedPartIds?: PartId[];
  positionError?: number;
  angleErrorRadians?: number;
}
export type AssemblyAction =
  | { type: 'SELECT_PART'; partId: PartId | null }
  | { type: 'SET_TRANSFORM'; partId: PartId; transform: Transform }
  | { type: 'INSTALL_PART'; partId: PartId }
  | { type: 'REMOVE_PART'; partId: PartId }
  | { type: 'UNDO' }
  | { type: 'RESET' }
  | { type: 'SET_MODE'; mode: AssemblyMode }
  | { type: 'SET_EXPLODED'; exploded: boolean }
  | { type: 'SET_INTERACTION_MODE'; interactionMode: InteractionMode }
  | { type: 'SET_VIEW_PRESET'; viewPreset: ViewPreset };
export interface AssemblyTransition { state: AssemblyState; feedback?: InstallationCheckResult }
/** Pure rules. Failed actions preserve state. No DOM, Three.js or storage dependencies. */
export interface AssemblyRules {
  createInitialState(): AssemblyState;
  checkInstall(state: AssemblyState, partId: PartId): InstallationCheckResult;
  checkRemoval(state: AssemblyState, partId: PartId): InstallationCheckResult;
  apply(state: AssemblyState, action: AssemblyAction): AssemblyTransition;
}
export type SceneUserOperation = Extract<AssemblyAction, {type: 'SELECT_PART' | 'SET_TRANSFORM'}>;
export interface SceneMetrics { fps: number; frameTimeMs: number; renderer: string; drawCalls?: number }
export interface SceneAdapterOptions {
  container: HTMLElement;
  /** UI may own all visible controls; built-in scene controls are optional. */
  language?: 'en' | 'zh';
  showBuiltinControls?: boolean;
  definitions: readonly PartDefinition[];
  state: AssemblyState;
  onOperation: (operation: SceneUserOperation) => void;
  onMetrics?: (metrics: SceneMetrics) => void;
  onError?: (message: string) => void;
}
/** update never echoes operations; explosion only changes display. Emit once per finished drag. */
export interface SceneAdapter {
  update(state: AssemblyState, definitions: readonly PartDefinition[]): void;
  setLanguage?(language: 'en' | 'zh'): void;
  setExplosionAmount?(amount: number): void;
  setIsolation?(enabled: boolean): void;
  setHideOuter?(enabled: boolean): void;
  resize(width: number, height: number): void;
  dispose(): void;
}
export type SceneAdapterFactory = (options: SceneAdapterOptions) => SceneAdapter;
export interface TeachingStep { id: string; title: string; titleEn: string; description: string; descriptionEn: string; partIds: PartId[]; hint: string; hintEn: string }
