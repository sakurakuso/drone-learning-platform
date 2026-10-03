import type { AssemblySnapshot, PartDefinition, PartId, TeachingStep } from '../contracts';
import { cloneTransform, isValidTransform } from './math';

export interface Catalog { definitions: PartDefinition[]; byId: Map<PartId, PartDefinition>; steps: TeachingStep[] }

export function createCatalog(definitions: readonly PartDefinition[], steps: readonly TeachingStep[]): Catalog {
  const copies = definitions.map(d => ({ ...d, initialTransform: cloneTransform(d.initialTransform), targetTransform: cloneTransform(d.targetTransform), prerequisites: [...d.prerequisites], tolerances: { ...d.tolerances } }));
  const byId = new Map<PartId, PartDefinition>();
  for (const d of copies) {
    if (!d.id || byId.has(d.id)) throw new Error(`INVALID_CATALOG: duplicate or empty part id ${d.id}`);
    if (!isValidTransform(d.initialTransform) || !isValidTransform(d.targetTransform)) throw new Error(`INVALID_CATALOG: transform ${d.id}`);
    if (!Number.isFinite(d.tolerances.position) || d.tolerances.position < 0
      || !Number.isFinite(d.tolerances.angleRadians) || d.tolerances.angleRadians < 0 || d.tolerances.angleRadians > Math.PI) throw new Error(`INVALID_CATALOG: tolerance ${d.id}`);
    if (new Set(d.prerequisites).size !== d.prerequisites.length) throw new Error(`INVALID_CATALOG: duplicate prerequisite ${d.id}`);
    byId.set(d.id, d);
  }
  const visiting = new Set<PartId>(), visited = new Set<PartId>();
  function visit(id: PartId): void {
    if (visiting.has(id)) throw new Error(`INVALID_CATALOG: cyclic prerequisite ${id}`);
    if (visited.has(id)) return;
    const definition = byId.get(id);
    if (!definition) throw new Error(`INVALID_CATALOG: unknown prerequisite ${id}`);
    visiting.add(id);
    definition.prerequisites.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  copies.forEach(d => visit(d.id));
  const stepIds = new Set<string>();
  for (const step of steps) {
    if (!step.id || stepIds.has(step.id) || !step.partIds.length || new Set(step.partIds).size !== step.partIds.length || step.partIds.some(id => !byId.has(id))) throw new Error(`INVALID_CATALOG: step ${step.id}`);
    stepIds.add(step.id);
  }
  return { definitions: copies, byId, steps: steps.map(step => ({ ...step, partIds: [...step.partIds] })) };
}

export function cloneSnapshot(state: AssemblySnapshot): AssemblySnapshot {
  return {
    parts: Object.fromEntries(Object.entries(state.parts).map(([id, p]) => [id, { installed: p.installed, transform: cloneTransform(p.transform) }])),
    selectedPartId: state.selectedPartId, mode: state.mode, exploded: state.exploded, interactionMode: state.interactionMode, viewPreset: state.viewPreset,
  };
}
