# 无人机 AI 训练平台 Hackathon 资源指南

整理日期：2026-10-03。面向 4 人团队、约 12 小时的开发窗口。建议以“飞行练习 → 数据记录 → AI 复盘 → 针对性再训练”为核心演示，组装功能作为扩展。以下开源项目已查阅上游说明与许可证，尚未完成本项目的安装、集成或飞行精度验证。

## 1 比赛要求与交付

依据团队提供的赛道现场照片，赛道为 **Startup – Bring Your Own Idea!**，允许自选问题、客户和方案。

| 评审项 | 本项目应提供的证据 |
| --- | --- |
| Problem Understanding | 明确 FPV 初学者或培训机构的困难；用简短用户访谈验证 |
| Technical Execution | 可操作原型、真实训练记录和完整客户流程 |
| Use of AI | AI 根据训练证据诊断问题并选择练习，成为教学核心 |
| Commercial Viability | 谁付费、为什么选择我们、如何开展试点 |
| Presentation & Q&A | 清楚说明自研贡献、复用部分、限制和下一步 |

需要提交可展示的原型或 MVP，以及包含问题、方案、商业模式和后续计划的 Pitch。现场材料列出 AWS 和 Microsoft，并提及 AWS Credits 与 Microsoft Student Ambassador；具体额度、资格、云服务可用权限和完整提交规则仍需向主办方确认。不能把奖品视为已获得的开发资源。

## 2 团队已有资料

| 资料 | 已观察到的内容 | 建议用途与边界 |
| --- | --- | --- |
| 穿越机课程 | 教学平台内容稿、手册、课件合订本；20 课，覆盖基础与安全、组装焊接、Betaflight 配置与模拟、实飞、维护 | 提取经审阅的练习目标、常见错误、讲解依据；材料编号缺少第 17、18 课，不能描述为完整 22 课 |
| 课程 PDF 与图片 | 9 个 PDF、1331 张渲染图片 | 优先使用可检索正文；图片适合补充展示，避免重复导入全部资源 |
| CAD 模型 | 209 个 SLDPRT、12 个 SLDASM、1 个 STEP | 可用于组件观察或爆炸图；STEP 是单个电机，不能直接当作整机模型 |
| 方案文档 | 已整理无人机 AI 训练平台建议方案 Word 文档 | 用于团队分工、MVP 范围与 Pitch 准备 |

CAD 文件名涉及空中机器人组件，是否与课程中的 FPV 机型一致尚未验证；装配结构、格式导入和实际尺寸也需要检查。课程中存在“可直接手接”“不会伤人损物”等绝对安全表述，必须修订后再进入 AI 知识库。原始课程、CAD、图片和 Word 文档的公开传播权限尚未确认，本指南只公开资源概述，不包含这些原始文件。

## 3 最有价值的开源资源

优先级是针对本次时间窗口的方案判断，不代表独立完成了性能评测。模拟器选一个即可。

| 优先级 | 项目与官方链接 | 有价值的功能 | 许可证与主要限制 |
| --- | --- | --- | --- |
| 首选评估 | [RCForge](https://github.com/adithya-s-k/RCForge) | 浏览器 RC 模拟；四旋翼预设；组件、质量与重心配置；键盘与控制器；CSV 遥测、录像和回放 | MIT，另查第三方资源声明。上游明确预设仍属实验性质，未用实飞数据校准；自托管可运行完整工作台，托管版部分功能有登录要求 |
| FPV 快速备选 | [FPV.Sim](https://github.com/AristidesAI/FPV.Sim) | Three.js 浏览器 FPV；手动模式；Betaflight Actual Rates；Gamepad 输入；城市障碍场景 | MIT。主要逻辑集中在 index.html，单人模式适合快速改造；多人服务可暂缓。物理精度和控制器兼容性需实测 |
| 场景与任务参考 | [propwash](https://github.com/mqnc/propwash) | Three.js 与 Rapier；地图、任务配置；键盘鼠标或手柄；FPV 与第三人称视角 | 代码 MIT，场景资产有独立许可，包括 CC BY 与 CC BY-NC-SA，不能全部按 MIT 使用。物理模型简化，缺少地效、电池压降等 |
| 组装展示基础 | [Three.js](https://github.com/mrdoob/three.js) | 浏览器 3D、模型加载、旋转观察，可实现组件高亮与爆炸图 | MIT。组装顺序、连接规则和错误检查需要团队自行实现 |
| CAD 转换辅助 | [occt-import-js](https://github.com/kovacsv/occt-import-js) | OpenCascade WASM；在浏览器或 Node 读取 STEP、IGES、BREP 并输出网格与层级 | LGPL-2.1。不直接支持 SLDPRT 或 SLDASM，需先导出；转换结果不包含自动教学规则 |
| 后续实飞日志 | [Betaflight App](https://github.com/betaflight/betaflight-configurator) 与 [blackbox-tools](https://github.com/betaflight/blackbox-tools) | 飞控配置、Blackbox 查看；工具可解码日志并生成 CSV | GPL-3.0。旧独立 [blackbox-log-viewer](https://github.com/betaflight/blackbox-log-viewer) 已冻结新功能，转向 Betaflight App；日志字段不一定包含高度或碰撞，不能直接等同模拟器数据 |
| 后续控制研究 | [gym-pybullet-drones](https://github.com/learnsyslab/gym-pybullet-drones) | Python、PyBullet、控制器、多机与强化学习环境 | MIT。适合无人机自主控制研究；训练飞行算法与指导人类学员是不同任务，12 小时内不建议引入 RL 训练 |
| 后续工程仿真 | [PX4 Autopilot](https://github.com/PX4/PX4-Autopilot) | 飞控、SITL/HITL、MAVLink；可结合 [Gazebo](https://docs.px4.io/main/en/sim_gazebo_gz/) | BSD-3-Clause。集成成本较高，且与 Betaflight 栈不同；团队已有环境时才适合本次使用 |

### 复用时保留的来源

- RCForge：[LICENSE](https://github.com/adithya-s-k/RCForge/blob/main/LICENSE)、[THIRD_PARTY_NOTICES](https://github.com/adithya-s-k/RCForge/blob/main/THIRD_PARTY_NOTICES.md)。
- FPV.Sim：[LICENSE](https://github.com/AristidesAI/FPV.Sim/blob/main/LICENSE)。
- propwash：[LICENSE 与资产说明](https://github.com/mqnc/propwash/blob/main/LICENSE)。
- occt-import-js：[LICENSE](https://github.com/kovacsv/occt-import-js/blob/main/LICENSE.md)。

保留原作者与许可证，分别核对代码、模型、纹理和音频的授权；采用 GPL 或 LGPL 组件时，按实际集成与分发方式落实对应要求。公开可见但没有许可证的项目，不默认具有复制和改造许可。课程提到的 Uncrashed、Liftoff、TRYP、VelociDrone 可作教学参考，不能当作已获授权的开源代码。

## 4 推荐原型与数据接口

**推荐方案：先评估 RCForge；若接入太慢，切换 FPV.Sim。** 团队自研课程映射、训练指标和 AI 教练。只做一架四旋翼、一个场景、一个高度控制任务。是否选择首选项目，以能否快速获得稳定飞行与可导出数据为依据。

1. 学员查看组件与练习目标；组装展示可以只做组件高亮或一项装配错误检查。
2. 完成一段短练习，记录时间、油门、位置或高度、姿态和碰撞事件。只使用模拟器实际提供的字段。
3. 普通代码计算高度偏差、油门变化、碰撞次数等指标。
4. AI 结合指标、具体事件与经审阅课程段落，输出“观察证据、可能原因、下一项练习”。证据不足时提出诊断练习，避免确定性归因。
5. 学员重新训练，在相同任务条件下比较指标；两次练习的改善仅作为演示结果，不能据此声称真实飞行能力已提升。

建议统一日志字段：session_id、timestamp_ms、task_id、throttle、position、attitude、events、source。缺失字段保留为空，不生成虚假遥测。source 应区分现场练习、导入实飞日志和示例数据。

AI 可调用团队现有可用的模型服务；先做练习后的分析，避免把实时物理计算交给语言模型。API Key 放在服务端或本地环境变量中，不进入公共仓库。

## 5 四人约 12 小时执行安排

| 时间 | 工作与产物 |
| --- | --- |
| 0–1 小时 | 确定目标学员、选定模拟器、锁定一种任务和日志字段 |
| 1–4 小时 | A 做界面与集成；B 做模拟与记录；C 做课程审阅与 AI；D 做访谈、Pitch 和演示素材 |
| 4–6 小时 | 接通练习、日志、AI 复盘和下一项练习 |
| 6–8 小时 | 完成同条件再训练；邀请目标用户试用并记录反馈 |
| 8–10 小时 | 修复关键问题，整理指标、来源声明与商业假设 |
| 10–12 小时 | 冻结范围、录制备份演示、排练并核对主办方提交要求 |

如果第 4 小时仍无法稳定模拟，采用“导入日志 → AI 复盘 → 训练建议”的备选原型，并明确演示数据来源。暂缓完整 CAD 转换、任意零件组合、多地图、账户系统、真机连接和自行训练模型。

## 6 演示验收与 Pitch

- 用户能完成一次练习，看到对应日志和基于该日志的 AI 复盘。
- 每项教学建议能够追溯到训练事件或已审阅的课程内容。
- 能选择下一项练习并比较相同条件下的前后指标。
- 清楚标注第三方模拟器、团队新增功能和未验证的物理精度。
- 如模拟不可用，导入日志的备选演示可完成相同复盘流程。

Pitch 建议用“新手练习后不知道为什么失败”引入，演示一次错误、AI 的证据解释和一次针对性重练。首批客户可假设为培训机构或高校无人机社团；按班级或活跃学员收费目前只是商业假设，需要 2–3 次目标客户访谈确认付费主体、现有成本与采购意愿。

本次自研价值是把课程、训练数据和个性化练习串成教学流程。未来再验证仿真与实飞的对应关系、增加装配校验和教练管理功能。


## 分类存储的具体数据

完整分类目录：[resources/physics](resources/physics/README.md)。包含 UIUC 原始翼型数据包、螺旋桨文件索引、模型参数与来源清单。用户提供资料的修正说明见[核对结果](resources/physics/references/REVIEW.md)。

## 7 可直接复用的场景数据

以下为已检查的仓库文件和说明，尚未在本项目中运行。直接加载指在原模拟器中使用；迁移到另一引擎时仍需处理尺度、坐标、碰撞、出生点和任务逻辑。

| 项目 | 场景及数据形式 | 接入方式与限制 |
| --- | --- | --- |
| propwash | Issum 城镇、Playground、Bando 废弃城市、游乐园、低多边形城市；GLB 模型配套 JSON5 配置 | 最适合快速复用现成 FPV 场景；保留原项目加载流程能减少迁移工作。模型可导入 Three.js，但碰撞与评分并不会随模型自动迁移 |
| RCForge | Northfield club、Alpine meadow、Desert mesa；程序生成场景、纹理与地形高度 JSON | 可直接使用自带机场练习高度控制。树木、建筑和地形碰撞未实现，模拟着陆面仍为平面，不能直接用于可靠的避障评分 |
| FPV.Sim | 城市与障碍物主要由 index.html 中代码生成 | 适合随原项目复用；独立迁移需要提取场景生成和碰撞逻辑 |

### 现成地图与配置链接

| 文件 | 内容与建议用途 |
| --- | --- |
| [playground_2b.glb](https://github.com/mqnc/propwash/blob/main/assets/maps/playground_2b.glb) | Playground 地图，优先评估基础飞行与绕障演示 |
| [issum_challenges.glb](https://github.com/mqnc/propwash/blob/main/assets/maps/issum_challenges.glb) | Issum 城镇；上游提供城堡、气球与自由飞行任务 |
| [post-apocalyptic_city.glb](https://github.com/mqnc/propwash/blob/main/assets/maps/post-apocalyptic_city.glb) | Bando 废弃城市，适合复杂 FPV 场景演示 |
| [playground.json5](https://github.com/mqnc/propwash/blob/main/configs/playground.json5) | 已配置模型路径、位置等参数，可参考加载方式 |
| [propwash configs](https://github.com/mqnc/propwash/tree/main/configs) | 地图、难度与任务配置集合 |
| [RCForge scenery.ts](https://github.com/adithya-s-k/RCForge/blob/main/src/core/scenery.ts) | 三种环境的气温、海拔、材质和随机种子等参数 |
| [RCForge 地形数据](https://github.com/adithya-s-k/RCForge/tree/main/src/view/data) | Alpine 与 Mesa 的高度采样；上游说明为 129 × 129 网格、12 km 范围 |

propwash 的上游署名表将 Playground、Issum 和废弃城市对应模型列为 CC BY 4.0；应保留作者、来源、许可证并注明修改。游乐园为 CC BY-NC-SA 4.0，面向商业化的原型优先采用其他地图。[propwash 资产来源与许可](https://github.com/mqnc/propwash#attributions)

RCForge 的摄影纹理主要来自 CC0 资源；植被图集为项目生成资产，地形采样另有来源与署名要求，不能把全部数据一概标为 MIT。高度数据改善视觉地貌，不代表真实机场复原或具备地形碰撞。[RCForge 场景数据与来源说明](https://github.com/adithya-s-k/RCForge/blob/main/public/scenery/README.md)

## 8 空气动力学与物理数据分析

**RCForge 已有物理阻力模型；整机实飞精度尚未验证。** 应分别说明物理模型、参数来源、数值验证和实测校准，避免把计算一致性当成真实机型精度。

| 资源 | 已有物理能力 | 数据依据与边界 |
| --- | --- | --- |
| RCForge | 相对气流、方向性机身阻力、重力、质量与惯性、推力与力矩；固定翼支持升力、阻力及力矩系数表 | 四旋翼多项参数仍为估计；450 mm 预设使用部分厂商推力与电流数据，但整机未校准。翼面系数表功能属于固定翼建模，不能等同四旋翼旋翼气动 |
| gym-pybullet-drones | 刚体动力学、旋翼推力与反扭矩；可选阻力、地效和下洗模型 | 阻力代码引用 Forster 2015 的 Crazyflie 系统辨识；地效与下洗采用简化模型。需选择启用相应效果的 physics 模式，且参数不能直接通用于任意 FPV 机型 |
| UIUC 螺旋桨数据库 | 小型无人机与模型飞机螺旋桨的风洞性能测量，可用于推力与功率建模 | 需要匹配具体桨型、转速和来流条件；它不是整机阻力或飞行日志数据集 |
| UIUC 低速翼型数据 | 低雷诺数翼型的风洞性能数据 | 更适合固定翼升阻力研究；翼型数据不等同有限翼或整个四旋翼的气动参数，数据有专门分发与署名条件 |

### RCForge 的空气阻力实现

机体各轴的方向性阻力使用以下形式：

```text
v_rel = v_vehicle - v_wind
F_drag,i = -0.5 × rho × (CdA)_i × abs(v_rel,i) × v_rel,i
```

这里的相对气流先转换到机体系；rho 为空气密度，(CdA)_i 为各轴有效阻力面积，结合阻力系数与参考面积。阻力与该轴相对速度的平方相关、方向相反。代码字段为 bodyDragAreaM2。

这属于实时使用的简化气动模型，没有直接根据 CAD 外形求解完整空气流场。准确程度依赖阻力、推进、惯性等参数的测量与校准；CAD 外形本身不足以确定这些参数。[RCForge 实现源码](https://github.com/adithya-s-k/RCForge/blob/main/src/core/simulation.ts)

RCForge 的固定翼翼面模型还能按迎角和雷诺数插值 CL、CD、CM 系数，并报告超出数据范围的情况；这需要用户提供适用的气动表。[翼面系数实现](https://github.com/adithya-s-k/RCForge/blob/main/src/core/aerodynamics.ts)

### 已有验证与尚缺的证据

RCForge 发布了数值验证与外部引擎对照报告，包含解析物理案例、匹配假设下的 JSBSim 对照和 NASA 无外力矩旋转参考。这些检验可以发现积分、坐标和受力实现错误；没有证明预设机型与真实飞机一致。报告为 2026-09-08 的上游快照，本项目尚未重新运行。NASA 对照检验的是旋转计算，不能作为空气动力精度证明。[上游验证报告](https://github.com/adithya-s-k/RCForge/blob/main/docs/benchmarks.md)

四旋翼仍缺少旋翼干扰、气动地效、完整电调与传感器延迟等模型，控制器也不是 Betaflight 固件仿真。预设中的油门命令不能直接理解为校准后的实际 ESC 百分比。[四旋翼模型及限制](https://github.com/adithya-s-k/RCForge/blob/main/docs/multirotors.md)

### 物理代码与实测数据入口

- [gym-pybullet-drones BaseAviary.py](https://github.com/learnsyslab/gym-pybullet-drones/blob/main/gym_pybullet_drones/envs/BaseAviary.py)：查看 _drag、_groundEffect、_downwash 的具体公式与来源。
- [UIUC 螺旋桨数据库](https://m-selig.web.engr.illinois.edu/props/propDB.html)：可下载实验数据；按页面推荐格式引用，并检查下载数据的使用条款。
- [UIUC 低速翼型风洞数据](https://m-selig.web.engr.illinois.edu/pd.html)：提供多卷数据；页面要求署名并随数据分发许可等材料，不能当作无条件 CC0 数据。

## 9 本次原型的物理分析建议

**建议增加一个轻量物理分析面板**：显示相对空速、模型估算的空气阻力、推力、姿态和高度变化。受力值属于模型计算结果，界面应明确标注；若现有遥测未提供，需要从物理核心额外接出，不能假定 CSV 已包含所有量。

演示可在相同任务下比较无风与固定侧风条件，保留操纵、姿态与轨迹记录。AI 结合真实记录解释观察到的偏移和操纵变化；若缺乏证据则给出可能原因与诊断练习。可重复的单一风条件更便于展示，不应将简化阵风称为经过验证的湍流模型。

本次交付范围建议只增加一个场景、一种风条件和物理面板，暂缓完整流场 CFD。验收时检查单位、坐标、风向与受力方向，以及每项教学判断对应的日志证据；不得将演示结果宣传为已达到实飞训练精度。接入与上述验收仍属于后续工作。

对外可表述为“基于物理模型的训练模拟与数据分析”。后续若要声称特定机型精度，应测量质量、重心、惯性、推进曲线和气动参数，并用未参与拟合的独立实飞日志报告误差与适用范围。

**Recommended implementation model:** GPT-6.1 Sol — Medium  
**Why:** 剩余工作是按明确范围接入模拟器、训练日志与 AI 复盘，适合有边界的实现任务。
