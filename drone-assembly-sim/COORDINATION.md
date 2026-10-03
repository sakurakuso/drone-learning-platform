# 无人机组装模拟器 · 协作接口 v1

日期：2026-10-03。共享接口先于模块开发固定；所有尺寸、布局、装配关系均为教学假设。

## 公共入口与所有权

- 骨架、界面和集成窗口：package.json、配置、src/contracts/、src/data/、src/ui/、src/state/、src/integration/、App.tsx、main.tsx、styles.css、README、验证记录。
- 3D 场景窗口：仅 src/scene/。预期入口 `src/scene/index.ts`，导出 `createSceneAdapter: SceneAdapterFactory`。使用 Three.js 本地依赖；提交场景、鼠标选择、移动/旋转控件、目标提示、视角、爆炸图、resize/dispose 和运行说明。
- 装配规则窗口：仅 src/assembly/。预期入口 `src/assembly/index.ts`，导出 `createAssemblyRules(definitions: readonly PartDefinition[]): AssemblyRules`。提交纯函数规则、历史撤销、拆卸前置检查、数值/四元数边界检查、单元测试和验证说明。
- 未确认其他窗口停止编辑之前，集成窗口不修改 src/scene/ 或 src/assembly/；兼容补丁放入自己的 src/integration/。各窗口可读取共享文件，不自行改写契约。

## 统一契约

`src/contracts/index.ts` 为唯一类型入口；数据入口 `src/data/parts.ts` 的 `partDefinitions`，步骤入口 `src/data/steps.ts` 的 `teachingSteps`。17 个实例使用稳定编号，错误码语言无关，中文/英文由 UI 映射。`name` 为中文，`nameEn` 为英文。

- 坐标右手系，Y 向上；单位为教学单位。四元数 `[x,y,z,w]`，单位长度；角度容差为弧度。位置误差用欧氏距离，旋转误差应使用 `2*acos(abs(dot(q1,q2)))`，q 与 -q 等价。
- PartDefinition 提供 geometry.kind/size/color/radius、initialTransform、targetTransform、prerequisites、tolerances、explosionOffset、参考文件和假设说明。几何 size 是该简化部件的包络尺寸，不是原机尺寸。
- AssemblyState 包含 parts、选择、模式、交互模式、视角、exploded、schemaVersion=1、history 和 revision。history 为 AssemblySnapshot，保存真实变换与安装标记；建议上限 100。错误操作不改变状态，也不创建历史。已安装件锁定，拆卸先检查已安装依赖件。
- SceneAdapterFactory 接收 container/definitions/state/onOperation/onMetrics/onError；返回 update/resize/dispose。用户操作只发 SELECT_PART 或 SET_TRANSFORM；每次完整拖动只发一个变换。update 不回传用户事件；已安装件与爆炸视图禁止变换。
- 爆炸图只使用 displayPosition = realPosition + explosionOffset，不修改真实 transform；退出恢复。视角变化不得改装配状态。
- AssemblyRules.createInitialState/checkInstall/checkRemoval/apply；所有函数同步纯计算。安装通过后吸附到 targetTransform，拆卸后保留安装位作为可移动散件。SET_TRANSFORM 验证有限数、非零归一化四元数、正缩放；缩放不等目标则安装失败。
- 引导模式只提供推荐顺序；自由模式隐藏引导约束，但相同物理教学依赖始终检查。UI 的“对齐安装位置”只是 SET_TRANSFORM，不绕过安装规则。
- RESET 和真实变换/安装/拆卸进入历史。SELECT_PART、模式/视角/爆炸图切换不创建装配历史。UNDO 恢复真实状态，并保持当前界面视角/模式；细节以规则模块交付说明为准。

## 集成过程

1. 接口与首版数据建立后，先用 src/integration 中占位适配器完成 UI。
2. 另两个窗口交付各自入口与测试结果，并明确“停止编辑”。集成窗口只切换模块入口，先生产构建再进行真实浏览器验收。
3. 接口变更需追加到下面的变更记录，并让两个窗口确认。保存层使用 localStorage，加载时验证版本、完整 ID 集合、数值、安装关系和历史，不可信保存不直接传给场景。
4. README 和验证记录分别记录实际启动方法、测试证据、浏览器 FPS、离线本地加载和未通过项。文件创建不能代表功能通过。

## 变更记录

- v1 / 2026-10-03：首次契约；中英双语字段；独立 scene/rules 工厂接口；17 个简化实例。

- v1.1 / 2026-10-03：SceneAdapterOptions 新增可选 language、showBuiltinControls，SceneAdapter 新增可选 setLanguage；集成 UI 接管工具条，避免双工具条和爆炸滑块导致显示/状态不同步。装配契约不变。

- v1.2 / 2026-10-03：按用户新参考需求增加独立 `src/contracts/extensions.ts` 与 `src/extensions/index.ts`。为实验场景、设备联动、飞行训练、训练评估保留类型化接口和空注册表；不改装配/场景 v1.1，不启用硬件或云服务。详见 EXTENSIONS.md。

## 最终交付与接入

- 规则窗口确认 `src/assembly/` 停止编辑，入口 `createAssemblyRules(partDefinitions, teachingSteps?)` 与共享基本接口兼容。
- 场景窗口确认 `src/scene/` 停止编辑，入口 `createSceneAdapter` 支持 v1.1 可选语言与内置控件开关。
- 主控仅修改自己的 `src/integration/modules.ts` 接入正式工厂；未改动两个窗口的负责文件。
- UI 保存层保留完整撤销历史，使用独立版本化 localStorage 封装；暂不调用规则模块的无历史存档扩展。显式多槽位安装、级联拆卸不进入首版 UI；按基础接口执行逐件检查和逆依赖拆卸。

- v1.3 / 2026-10-03：最终验收将场景已有 setExplosionAmount/setIsolation/setHideOuter 方法暴露为可选共享接口，主界面接入滑块、隔离零件、隐藏保护架。三项仅影响展示；隐藏/隔离和展开程度不写入装配历史，刷新恢复爆炸模式时使用完整展开。保存校验要求已安装件保持精确吸附目标。
