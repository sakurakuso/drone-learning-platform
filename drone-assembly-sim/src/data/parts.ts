import type { PartCategory, PartDefinition, Quaternion, Transform, Vector3 } from '../contracts';
const IDENTITY: Quaternion = [0, 0, 0, 1];
const quarterTurn: Quaternion = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
export const transform = (position: Vector3, rotation: Quaternion = IDENTITY): Transform => ({ position: [...position], rotation: [...rotation], scale: [1, 1, 1] });
export const MODEL_NOTICE = '实物参考 · 精细材质教学模型';
export const MODEL_NOTICE_EN = 'Real-world references · Detailed teaching model';
export const MODEL_ASSUMPTION = '全部尺寸、四旋翼布局、安装位置、朝向、前置关系和容差为教学假设；未解析 CAD，不代表原机尺寸或真实装配关系。';
export const MODEL_ASSUMPTION_EN = 'All dimensions, quadcopter layout, target positions, orientations, prerequisites and tolerances are teaching assumptions. CAD is not parsed; this is not an accurate reconstruction.';
const refs = {
  frame: 'inputs/references/飞机/板材/CFB_下板_3mm.SLDPRT',
  leg: 'inputs/references/飞机/管材/起落架滑橇 1个.SLDPRT',
  motor: 'inputs/references/飞机/电子元件/X6-PLUS-D30_V3_0805.SLDPRT',
  propeller: 'inputs/references/飞机/标准件/STD_2480propeller.SLDPRT',
  guard: 'inputs/references/飞机/管材/主 桨保管.SLDPRT',
  controller: 'inputs/references/飞机/电子元件/N3主控器.SLDPRT',
  battery: 'inputs/references/飞机/电子元件/RM裁判系统 电池装配1222.SLDPRT',
};
function part(id: string, name: string, nameEn: string, category: PartCategory, kind: PartDefinition['geometry']['kind'], size: Vector3, color: string, reference: string, initial: Vector3, target: Vector3, prerequisites: string[], explosionOffset: Vector3, radius?: number): PartDefinition {
  return { id, name, nameEn, category, referenceFiles: [reference], geometry: { kind, size, color, radius }, initialTransform: transform(initial, quarterTurn), targetTransform: transform(target), prerequisites, tolerances: { position: 0.18, angleRadians: Math.PI / 18 }, assumption: MODEL_ASSUMPTION, explosionOffset };
}
const corners: {code: string; zh: string; en: string; x: number; z: number}[] = [
  { code: 'FL', zh: '左前', en: 'front left', x: -2.2, z: -2.2 },
  { code: 'FR', zh: '右前', en: 'front right', x: 2.2, z: -2.2 },
  { code: 'RL', zh: '左后', en: 'rear left', x: -2.2, z: 2.2 },
  { code: 'RR', zh: '右后', en: 'rear right', x: 2.2, z: 2.2 },
];
export const partDefinitions: PartDefinition[] = [
  part('FRAME-01', '主机架', 'Main frame', 'frame', 'frame', [4.6, 0.25, 4.6], '#526777', refs.frame, [-5.7, 0.45, 0], [0, 2, 0], [], [0, 0, 0]),
  part('LEG-L', '左起落架', 'Left landing skid', 'landing-gear', 'landing-gear', [0.2, 1.7, 4.2], '#9ba9b2', refs.leg, [-6.0, 0.9, -3.4], [-1.15, 1.05, 0], ['FRAME-01'], [-1.2, -0.5, 0]),
  part('LEG-R', '右起落架', 'Right landing skid', 'landing-gear', 'landing-gear', [0.2, 1.7, 4.2], '#9ba9b2', refs.leg, [-6.0, 0.9, 3.4], [1.15, 1.05, 0], ['FRAME-01'], [1.2, -0.5, 0]),
  ...corners.map((c, i) => part(`MOTOR-${c.code}`, `${c.zh}动力组件`, `${c.en} motor`, 'power', 'motor', [0.6, 0.55, 0.6], '#687e90', refs.motor, [5 + i % 2 * 1.9, 0.5, -4.5 + Math.floor(i / 2) * 1.8], [c.x, 2.36, c.z], ['FRAME-01'], [Math.sign(c.x) * 1.2, 0.7, Math.sign(c.z) * 1.2], 0.3)),
  ...corners.map((c, i) => part(`PROP-${c.code}`, `${c.zh}桨叶`, `${c.en} propeller`, 'propeller', 'propeller', [1.9, 0.09, 0.22], '#2ac6b2', refs.propeller, [5 + i % 2 * 2, 0.3, -0.6 + Math.floor(i / 2) * 1.5], [c.x, 2.72, c.z], [`MOTOR-${c.code}`], [Math.sign(c.x) * 1.2, 1.6, Math.sign(c.z) * 1.2])),
  ...corners.map((c, i) => part(`GUARD-${c.code}`, `${c.zh}保护架`, `${c.en} propeller guard`, 'guard', 'guard', [2.3, 0.18, 2.3], '#e2a35d', refs.guard, [4.7 + i % 2 * 2.65, 0.35, 3 + Math.floor(i / 2) * 2.65], [c.x, 2.72, c.z], [`PROP-${c.code}`], [Math.sign(c.x) * 2.1, 0.6, Math.sign(c.z) * 2.1], 1.15)),
  part('CTRL-01', '飞行控制模块', 'Flight controller', 'control', 'controller', [0.9, 0.3, 0.7], '#49a8e8', refs.controller, [-3.2, 0.3, -3.2], [0, 2.32, -0.65], ['FRAME-01'], [0, 2.6, -0.4]),
  part('BAT-01', '电池', 'Battery', 'battery', 'battery', [1.15, 0.5, 1.45], '#de7763', refs.battery, [-3.2, 0.4, 3.2], [0, 2.42, 0.72], ['CTRL-01', 'LEG-L', 'LEG-R'], [0, 3.8, 0.5]),
];
export const categories: PartCategory[] = ['frame', 'landing-gear', 'power', 'propeller', 'guard', 'control', 'battery'];
