import type { AssemblyState, PartDefinition, TeachingStep, Transform } from '../contracts';
import { equalScale, isValidTransform, positionDistance, quaternionAngle, withinTolerance } from '../assembly/math';

export type PlacementStatus = 'installed' | 'inspection' | 'invalid' | 'blocked' | 'move' | 'rotate' | 'scale' | 'ready';
export function placementGuide(part: PartDefinition, state: AssemblyState, transform: Transform = state.parts[part.id].transform) {
  const missing = part.prerequisites.filter(id => !state.parts[id]?.installed);
  const distance = positionDistance(transform, part.targetTransform);
  const angle = quaternionAngle(transform.rotation, part.targetTransform.rotation);
  const positionOK = withinTolerance(distance, part.tolerances.position);
  const angleOK = withinTolerance(angle, part.tolerances.angleRadians);
  const scaleOK = equalScale(transform, part.targetTransform);
  const status: PlacementStatus = state.parts[part.id].installed ? 'installed' : state.exploded ? 'inspection' : !isValidTransform(transform) ? 'invalid' : missing.length ? 'blocked' : !scaleOK ? 'scale' : !positionOK ? 'move' : !angleOK ? 'rotate' : 'ready';
  return { status, missing, distance, angle, positionOK, angleOK, scaleOK };
}

/** Current teaching phase plus the explicit selection. No independently stored slot positions. */
export function guideTargets(definitions: readonly PartDefinition[], steps: readonly TeachingStep[], state: AssemblyState, all: boolean) {
  const current = steps.find(step => step.partIds.some(id => !state.parts[id]?.installed));
  const phase = new Set(current?.partIds ?? []);
  return definitions.filter(part => part.id === state.selectedPartId || (!state.parts[part.id]?.installed && (all || phase.has(part.id))));
}

export function mountingDescription(part: PartDefinition, language: 'en' | 'zh') {
  const descriptions = {
    frame: ['工作台中央基准位；机头朝向蓝色 FRONT 箭头。', 'Central datum. Point the nose toward the blue FRONT arrow.'],
    'landing-gear': ['机架下方的同侧支撑位；长杆沿机头到机尾方向。', 'Matching side beneath the frame. Long rail runs front to rear.'],
    power: ['对应机臂末端的圆形电机座；输出轴朝上。', 'Round seat at the matching arm tip. Shaft faces upward.'],
    propeller: ['对应电机的输出轴上方；桨叶水平，中心孔对准轴心。', 'Above the matching motor shaft. Keep blades level and center the hub.'],
    guard: ['对应桨叶外围；中心与电机轴重合，支撑朝向机身。', 'Around the matching propeller. Center on the motor shaft, supports toward the body.'],
    control: ['机架中央前侧的蓝色安装区；方向标记朝向机头。', 'Blue mounting area at the front of the center deck. Direction mark points forward.'],
    battery: ['机架中央后侧的电池托位；长边沿机头到机尾方向。', 'Battery tray at the rear of the center deck. Long side runs front to rear.'],
  };
  return descriptions[part.category][language === 'zh' ? 0 : 1];
}
