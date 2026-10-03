# 无人机物理仿真资源与具体数据

整理日期：2026-10-03。面向无人机组装、飞行练习与 AI 复盘原型。提供资料值得收录，但部分预测、卷册信息和翼型推荐需更正。此目录将实测数据、模型预设和软件验证分开，避免把预设参数当作真实机型校准。

| 分类 | 内容 | 入口 |
| --- | --- | --- |
| 用户提供资料 | 原稿与逐项核对 | [核对结果](references/REVIEW.md)、[原稿](references/UIUC_LSAT_空气动力学数据.md) |
| 实测翼型 | UIUC 六个原始 ZIP、E387 示例；SoarTech 8 几何与统一升阻力 CSV | [翼型数据](measured/airfoils/README.md) |
| 实测螺旋桨 | 每个 data TXT 的具体 URL、字段、大小、SHA-256；完整包本地保存 | [螺旋桨数据](measured/propellers/README.md) |
| 模型参数 | RCForge 三个 Quad X、PyBullet 三个 URDF、PX4 两个 SDF，带数值参数 CSV | [模型与单位](models/README.md)、[具体参数](models/parameters.csv) |
| 数值验证 | RCForge 历史验证 JSON 与限制 | [验证报告说明](validation/README.md) |
| 场景配置 | propwash 默认、Playground、Issum 的 JSON5 | [场景配置](scene_configs/README.md) |
| 来源记录 | 下载日期、上游 commit、文件 SHA-256、下载状态 | [来源清单](source_manifest.json) |

## 使用次序

四旋翼先选可运行模拟器，再核对质量、惯性、转速单位、推进曲线与阻力接口。UIUC 翼型表主要用于翼面或叶素研究，不能直接给整个四旋翼赋值。螺旋桨数据需匹配具体桨型与来流；不应仅根据尺寸找近似曲线就声称实飞校准。

原始数据保留，派生 CSV 明确标注提取规则与来源行号；没有虚构缺失参数，也没有用 AI 生成数值填表。本目录确认了数据下载、解析与来源关系，尚未安装或运行这些模拟器，也没有完成目标机型校准。

各文件保留上游许可，不统一重新授权：UIUC Vol 1–5/Williamson 翼型及示例派生数据按其 GPL v2 和分发说明；SoarTech 8 的独立许可仍待核实；RCForge/PyBullet 为 MIT，PX4 模型为 BSD-3-Clause；场景模型另有 CC 许可。大型书籍 PDF 与不明确可镜像的资料使用官方入口链接。这里的快照与参数文件不构成可独立运行的完整仿真工程。
