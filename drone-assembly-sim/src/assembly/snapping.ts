import type { AssemblyState, PartDefinition, Transform } from '../contracts';
import { equalScale, isValidTransform, positionDistance, withinTolerance } from './math';

/** Capture distance in schematic teaching units, separate from mechanical tolerances. */
export const SNAP_RADIUS = 0.9;
export function snapEligibility(part: PartDefinition, state: AssemblyState, transform: Transform) {
  const valid = isValidTransform(transform);
  const distance = valid ? positionDistance(transform, part.targetTransform) : Infinity;
  const near = withinTolerance(distance, SNAP_RADIUS);
  const missing = part.prerequisites.filter(id => !state.parts[id]?.installed);
  const scaleOK = valid && equalScale(transform, part.targetTransform);
  return { distance, near, missing, scaleOK, canSnap: valid && near && scaleOK && !missing.length && !state.exploded && !state.parts[part.id]?.installed };
}
