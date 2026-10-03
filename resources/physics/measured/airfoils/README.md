# UIUC 实测翼型数据

这里保留官方 volume01–volume06 六个 ZIP 原始数据包，以及一个 E387 clean 构型的可读示例。文件未改动；SHA-256 与来源见 ../../source_manifest.json。volume06 对应 Williamson 的大襟翼偏转论文，不是独立的正式第六卷书籍。archive_inventory.csv 列出 322 个包内文件，不等同 322 个翼型。

| 数据组 | 官方报告条件概况 | 当前目录 |
| --- | --- | --- |
| Vol 1 | 1995；34 翼型；Re 30000–500000；292 页 | [volume01.zip](archives/volume01.zip) |
| Vol 2 | 1996；25 翼型；Re 40000–400000；252 页 | [volume02.zip](archives/volume02.zip) |
| Vol 3 | 1998；37 翼型；Re 60000–500000；418 页 | [volume03.zip](archives/volume03.zip) |
| Vol 4 | NREL 2004 报告；6 翼型；Re 100000–500000；133 页 | [volume04.zip](archives/volume04.zip) |
| Vol 5 | 2012；363 页；包含不同襟翼和表面构型 | [volume05.zip](archives/volume05.zip) |
| Williamson thesis | 2012；535 页；大襟翼偏转 | [volume06.zip](archives/volume06.zip) |

## 字段与示例

examples/e387_c_drg.txt 为 Vol 4 的 E387 clean 原始阻力文件。CSV 是 2026-10-03 提取的前三个数值列，保留原始行号与试验 Reynolds 数；没有插值、补数据或与升力文件合并。

- alpha_deg：迎角，度。
- cl、cd：无量纲升力及阻力系数；单独的 lift 文件可能包含 cm。
- reynolds：无量纲，使用对应试验块的实际平均值。
- 原文件中的 Spanwise Cd 是各测点值，CSV 未保留；完整值仍在原文件。

Vol 1–2 的 lift/drag 汇总表格式与后续单翼型文件不同，需按各自 FORMAT/README 解析。clean 与 tripped/Gurney/flap 的数据不能混用；升力、阻力、力矩若迎角不同，不可按行号直接拼接。

## 来源和分发

数据由 UIUC Low-Speed Airfoil Test program 产生；版权所有者为上游作者，详见各包 BOOK/README 与本目录 notices。附 GPL.TXT、MANIFEST.TXT；上述 Vol 1–5 与 Williamson 数据及示例 CSV 派生文件按上游 GPL v2 与数据说明分发，不重新标为 MIT。保留原始数据，不限制接收者继续复制分发。

官方：[项目与原始数据入口](https://m-selig.ae.illinois.edu/uiuc_lsat.html)、[数据分发说明](https://m-selig.ae.illinois.edu/pd.html)。本仓库尚未验证其作为具体无人机模型输入的精度。

## SoarTech 8 独立数据组

[SoarTech 8 分类目录](soartech8/README.md)另行保留翼型几何、原始升力与升阻力、派生 CSV、异常点与来源清单。它来自普林斯顿前期测试，与上述六个数据包分开管理。提供的 CSV 仅有迎角与升力；阻力取自 ALL.PD。独立许可待核，不套用本节上方其他卷册的 GPL 声明。
