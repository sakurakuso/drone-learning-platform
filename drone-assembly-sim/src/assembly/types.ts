import type { AssemblyRules, AssemblySnapshot, AssemblyState, AssemblyTransition, InstallationCheckResult, PartId, TeachingStep, Transform } from '../contracts';

export interface DetailedCheckResult extends InstallationCheckResult {
  positionTolerance?: number;
  angleToleranceRadians?: number;
  expectedScale?: Transform['scale'];
  actualScale?: Transform['scale'];
}
export type SlotCheckResult = DetailedCheckResult | {
  ok: false; code: 'WRONG_SLOT'; partId: PartId; slotId: PartId; expectedSlotId: PartId;
};
export interface SlotTransition { state: AssemblyState; feedback: SlotCheckResult }
export interface StepProgress {
  step: TeachingStep;
  status: 'blocked' | 'available' | 'complete';
  installedPartIds: PartId[];
  remainingPartIds: PartId[];
  availablePartIds: PartId[];
}
export interface AssemblyProgress {
  installedCount: number;
  totalCount: number;
  fraction: number;
  complete: boolean;
  availablePartIds: PartId[];
  steps: StepProgress[];
  currentStepId: string | null;
  nextHint: { code: 'INSTALL_AVAILABLE_PART' | 'ASSEMBLY_COMPLETE'; partId?: PartId; stepId?: string; text?: string; textEn?: string } | null;
}
export type SaveErrorCode = 'EMPTY_SAVE' | 'INVALID_JSON' | 'SAVE_TOO_LARGE' | 'UNSUPPORTED_VERSION' | 'CATALOG_MISMATCH' | 'INVALID_SAVE' | 'UNKNOWN_PART' | 'MISSING_PART' | 'INVALID_TRANSFORM' | 'DEPENDENCY_INCONSISTENT' | 'INSTALLED_TRANSFORM_MISMATCH' | 'CHECKSUM_MISMATCH';
export interface SaveError { code: SaveErrorCode; path?: string; relatedPartIds?: PartId[] }
export interface SavedAssembly {
  schemaVersion: 1;
  catalogSignature: string;
  snapshot: AssemblySnapshot;
  checksum: string;
}
export type SaveValidation = { ok: true; snapshot: AssemblySnapshot } | { ok: false; error: SaveError };
export type RestoreResult = { ok: true; state: AssemblyState } | { ok: false; state: AssemblyState; error: SaveError };
export interface DragSession { readonly partId: PartId; readonly baseState: AssemblyState; readonly transform: Transform }
export type DragResult = { ok: true; session: DragSession } | { ok: false; code: 'UNKNOWN_PART' | 'PART_LOCKED' | 'INVALID_TRANSFORM' };
export type DragCommit = { ok: true; state: AssemblyState } | { ok: false; state: AssemblyState; code: 'STALE_DRAG' | 'UNKNOWN_PART' | 'PART_LOCKED' | 'INVALID_TRANSFORM' };
export interface AssemblyEngine extends AssemblyRules {
  checkInstall(state: AssemblyState, partId: PartId): DetailedCheckResult;
  checkSlot(state: AssemblyState, partId: PartId, slotId: PartId): SlotCheckResult;
  installAt(state: AssemblyState, partId: PartId, slotId: PartId): SlotTransition;
  remove(state: AssemblyState, partId: PartId, cascade?: boolean): AssemblyTransition;
  getProgress(state: AssemblyState): AssemblyProgress;
  beginDrag(state: AssemblyState, partId: PartId): DragResult;
  updateDrag(session: DragSession, transform: Transform): DragResult;
  commitDrag(state: AssemblyState, session: DragSession): DragCommit;
  serialize(state: AssemblyState): string;
  validateSave(input: unknown): SaveValidation;
  restore(input: unknown): RestoreResult;
}
