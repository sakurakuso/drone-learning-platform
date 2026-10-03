# SoarTech 8 翼型几何与风洞数据

这里分类整理仓库根目录已有的 [UIUC_空气动力学数据.zip](../../../../../UIUC_空气动力学数据.zip)，保留原文件并提供可读取的 CSV。数据为低速翼型截面与风洞性能数据；不包含完整无人机 CAD、整机参数、场景碰撞或 CFD 风场。

官方 [SoarTech 8 介绍与下载](https://m-selig.ae.illinois.edu/uiuc_lsat.html)说明：54 个翼型、1987–1988 年普林斯顿试验。文件数量、文件名变体、襟翼或转捩配置均不等同独立翼型数量。

## 分类入口

| 分类 | 内容 | 入口 |
| --- | --- | --- |
| 翼型几何 | 53 个原始 .COR 截面坐标；ALL.DAP 实测截面与试件弦长 | [坐标](geometry/coordinates/) · [实测截面](geometry/measured_profiles/ALL.DAP) |
| 原始升力 | 135 个原始文件，包含实际 Re、迎角与 Cl | [原始文件](lift/raw/) |
| 提供的 CSV | 107 个非空 CSV，12,602 行；只含有效 alpha/Cl | [原 CSV](lift/supplied_csv/) |
| 原始升阻力 | ALL.PD，含配置、实际 Re、Cl、Cd、迎角 | [原始极曲线](polars/raw/ALL.PD) |
| 统一格式 | 全部原始升力 15,565 行；有效升阻力 7,761 行；538 组曲线索引 | [lift.csv](derived/lift.csv) · [polars.csv](derived/polars.csv) · [曲线索引](derived/polar_curves.csv) |
| 待核数据 | 3 个空 CSV；1 行无法解析的原始阻力记录 | [空文件](quarantine/empty_csv/) · [异常记录](quarantine/polar_anomalies.csv) |
| 来源与核验 | 全部 304 个分类文件的包内路径、SHA-256；整理计数与规则 | [文件清单](file_catalog.csv) · [数据清单](dataset_manifest.json) |
| 使用说明 | 原始格式、试验日志、中文说明与勘误 | [原始 README](references/README) · [LIFT.LOG](references/LIFT.LOG) · [核对说明](REVIEW.md) |

## 派生字段和使用边界

- `alpha_deg` 为度；`cl`、`cd` 与 Reynolds 数均无量纲。
- `reynolds_actual` 取原始试验值，`reynolds_nominal` 仅在升力表中作为名义值；例如 E387A.06 为名义 60,000、实际 61,706。
- `curve_id` 唯一标识 ALL.PD 的配置块与 Re 组；`airfoil_label` 保留襟翼、转捩与重复测量等标签。不同构型和不同 Re 不直接混用。
- `source_file` 相对此目录，`source_line` 为原文件一基行号；`point_index` 保留原始顺序。部分升力记录含升/降迎角路径，不能直接排序去重后当作单值曲线。
- CSV 未插值、未补 0、未按行拼接不同试验。`polars.csv` 不含 `cm` 或 `cp`，原数据没有这些测量。
- 可用于固定翼截面分析或桨叶研究；四旋翼推力仍需整桨性能或叶素模型、旋转速度与入流条件。整机阻力和碰撞需其他参数与引擎。

## 核验和来源

整理日期：2026-10-03。193 个原始文件与官方 Stec8.zip 逐一字节一致；107 个非空 CSV 的数值与顺序和原升力文件一致；ZIP CRC 通过。ALL.PD 的 127 个配置块与 538 组曲线合计声明 7,762 点，其中 1 行异常单独记录，统一 CSV 留下 7,761 点。尚未接入任何仿真器验证训练效果。

本包未找到独立许可文本；不套用其他 UIUC 卷册的 GPL，也不重新标为 MIT。原始来源、作者与说明保留在 references。商业集成或进一步分发所需授权仍待核实。

返回 [翼型资源](../README.md) 或 [全部物理资源](../../../README.md)。
