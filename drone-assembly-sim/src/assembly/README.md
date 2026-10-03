# 装配规则与状态引擎

规则只用于教学，不表示原机真实安装要求，不求解 CAD 配合、碰撞或电气行为。引导和自由模式使用同一安装规则；爆炸图只影响展示，实际变换始终不带爆炸偏移。

## 规则与验证案例

- 目录注入共享 PartDefinition / TeachingStep，不另建真实零件编号、位置或依赖表。
- 先检查零件与槽位身份，再检查有效变换、前置零件、缩放、位置距离和最短旋转角。位置/角度边界包含等号；q 与 -q 表示同一旋转。
- 安装成功复制目标变换，精确吸附；失败不修改状态、不消耗撤销项。
- 选择和展示设置不单独占撤销项。移动、旋转、安装、拆卸、重置记录完整操作之前的快照。
- 拖动预览单独缓存，结束才提交一次；取消不留撤销项。事务提交检查基础状态是否过期。
- 拆卸必须检查全部已安装的传递依赖。默认返回提示且不修改；确认级联后原子拆卸并保留各自安装位置。
- 安装数、比例、可安装零件和步骤完成情况均从 parts 推导，不维护进度计数器。自由模式不主动输出提示。
- 保存记录带版本、目录规则签名和损坏校验；不保存历史或拖动预览。恢复检查全部零件、有限数值、单位四元数、合法缩放、设置枚举、安装变换及依赖；失败返回错误与可启动的初始状态。

验证矩阵：正确安装与精确吸附；错误槽位；位置/角度边界及刚超界；q/-q 和非单位四元数；缺少前置零件；缩放非法；传递依赖拆卸及取消；失败无状态变更；拖动单次撤销与取消/过期；撤销、重置；模式一致性；爆炸图隔离；进度推导；保存往返、未知/缺失零件、损坏 JSON、错误版本、规则变更、不合法安装记录。

## 共享接口建议（主控统一处理）

当前共享接口只有每零件一个 targetTransform，本模块暂以目标零件 id 作为槽位 id。主控若需独立 SlotId 或一个零件多个可选槽位，应统一增加槽位定义及匹配关系。

建议将显式槽位安装、级联拆卸、拖动事务、步骤进度、保存恢复及错误参数纳入共享接口。本模块在自己的目录提供兼容扩展，未修改 src/contracts/ 或 src/data/。基本入口 `createAssemblyRules(definitions)` 满足 `AssemblyRules`，第二个可选参数传入共享步骤。

共享错误码没有 `WRONG_SLOT`，因此 `checkSlot` / `installAt` 单独返回扩展结果；原 `checkInstall` / `apply(INSTALL_PART)` 沿用 v1，并隐含使用该零件自己的槽位。级联拆卸用 `remove(state, id, true)`，默认 `REMOVE_PART` 不级联。主控需在确认界面明确展示 `checkRemoval(...).relatedPartIds` 后才调用级联入口。

主控现有 `src/state/persistence.ts` 的存档格式与本模块不同。接入时应统一选择一种保存格式；本模块格式具有损坏校验且要求安装件已精确吸附，恢复不保留撤销历史。若继续使用主控自己的保存层，建议补齐同等严格的单位四元数及吸附变换校验，不能把两种记录直接互换。

## 主控调用示例

```ts
import { createAssemblyRules } from './assembly';
import { partDefinitions } from './data/parts';
import { teachingSteps } from './data/steps';

const engine = createAssemblyRules(partDefinitions, teachingSteps);
let state = engine.createInitialState();
const part = partDefinitions[0];
state = engine.apply(state, { type: 'SELECT_PART', partId: part.id }).state;
state = engine.apply(state, {
  type: 'SET_TRANSFORM', partId: part.id, transform: part.targetTransform,
}).state; // 只是对齐辅助；安装检查仍然执行。
const attempted = engine.installAt(state, part.id, part.id);
state = attempted.state;
// attempted.feedback.code / relatedPartIds / 实测误差与容差供界面映射。
const progress = engine.getProgress(state); // 实际状态推导。

const removal = engine.checkRemoval(state, part.id);
// 确认级联时：engine.remove(state, part.id, true)。取消时保持 state。
// state = engine.apply(state, { type: 'UNDO' }).state;
// state = engine.apply(state, { type: 'RESET' }).state;

// 主控持有 localStorage；建议用新 key，避免混淆主控现有存档格式。
localStorage.setItem('drone-assembly-sim:engine-save:v1', engine.serialize(state));
const restored = engine.restore(localStorage.getItem('drone-assembly-sim:engine-save:v1'));
state = restored.state; // 失败时也有合法初始状态，应用可以启动。
// !restored.ok 时界面映射 restored.error.code；存储访问异常由主控捕获。
void progress; void removal;
```

场景适配器按 COORDINATION.md 在每次完成拖动后发一次 `SET_TRANSFORM` 即可。如果主控需要每帧预览，可使用事务接口：

```ts
const started = engine.beginDrag(state, part.id);
const nextTransform = part.targetTransform; // 示例；实际取拖动控件输出的真实变换。
if (started.ok) {
  // 每帧更新 session，不将其写入已提交的 state。渲染预览使用 session.transform。
  const preview = engine.updateDrag(started.session, nextTransform);
  if (preview.ok) {
    const committed = engine.commitDrag(state, preview.session);
    if (committed.ok) state = committed.state;
    // STALE_DRAG 表示原 state 已被另一个动作/恢复替换，需重新开始拖动。
  }
  // 取消：丢弃 session。整次拖动仅提交一次，不保存预览。
}
```

## 行为细节与限制

- 四元数要求单位长度，允许 1e-6 的数值误差；零四元数、非单位四元数、稀疏数组、非有限数及非正缩放被拒绝。旋转距离使用与 `2*acos(abs(dot))` 等价的弦长公式，改善小角度数值精度。
- 容差含边界，仅放宽约 32 个浮点 epsilon；缩放匹配使用 1e-10 相对数值误差。不存在碰撞检测或“自动找到附近槽位”。
- 展示设置不占撤销项；撤销还原零件与选择，并保留当前 mode、exploded、interactionMode、viewPreset。重置回默认初始状态，可撤销；没有变化的重置不创建历史。历史默认最多 100 项。
- `getProgress` 中 available 指前置条件就绪，不保证当前姿态已满足安装容差。引导仅推荐最前的可操作步骤，不阻止其他符合依赖的步骤；自由模式 nextHint 为 null。
- 爆炸图不改变安装检查结果；按 v1 在爆炸视图拒绝修改真实变换。主控/场景不得把 explosionOffset 写入零件真实变换。
- 保存格式 `{schemaVersion:1,catalogSignature,snapshot,checksum}`；仅保存已提交快照，恢复丢弃历史。安装件恢复验证位置误差 <=1e-9、角误差 <=1e-8，并再次精确吸附。目录签名包含编号、初始/目标变换、依赖及容差，不含几何和提示文字。重新排序相同目录不会破坏存档。
- FNV-1a 32 位校验用于检测偶发损坏，不提供防篡改保证；String 存档最多 2,000,000 字符。版本或目录不兼容返回错误及新状态，不做自动迁移。主控负责 localStorage 权限/配额异常、确认交互和语言映射。
- 纯函数不修改传入状态。主控应将已提交的状态视为只读；事务通过基础对象身份阻止陈旧提交。

## 检查记录与负责文件

2026-10-03（香港时间）：`npm test -- src/assembly`：2 文件、89 项测试通过；`tsc --noEmit` 通过。随后 `npm test`：4 文件、99 项测试通过；`npm run build` 通过。全项目结果是当时共享目录的快照，不代表最终主控/3D 浏览器验收。

负责文件的绝对路径：

- `src/assembly/index.ts` — 公共入口。
- `src/assembly/engine.ts` — 规则、状态操作、撤销、事务与进度。
- `src/assembly/catalog.ts` — 共享定义副本、依赖图与步骤校验。
- `src/assembly/math.ts` — 变换合法性和数值比较。
- `src/assembly/serialization.ts` — 版本存档、校验与恢复。
- `src/assembly/types.ts` — 本目录兼容扩展类型。
- `src/assembly/engine.test.ts` — 46 项规则/状态行为测试。
- `src/assembly/serialization.test.ts` — 43 项存档/恢复测试。
- `src/assembly/README.md` — 本交付说明。

完成交付后本窗口停止编辑 src/assembly/；模块切换、共享契约调整及真实浏览器验收由主控统一处理。
