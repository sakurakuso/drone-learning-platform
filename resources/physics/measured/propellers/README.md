# UIUC 螺旋桨风洞数据

已下载官方完整压缩包（90,906,721 字节，约 86.7 MiB），包含 Vols 1–4 的网站与实验数据。完整包保存在项目本地 references 缓存，避免向 GitHub 提交大型镜像。公开目录提供 1994 个 data/*.txt 文件的具体下载 URL、原始列名、大小与 SHA-256，见 file_catalog.csv。这个数量是文本文件数，不是螺旋桨数或独立实验数。

字段按各文件原始表头解释：动态数据常见 J、CT、CP、eta；静态数据常见 RPM、CT、CP；geom 文件是几何数据。不要将几何文件或预测数据当作推力测量。

常用关系：J=V/(nD)，T=CT*rho*n²*D⁴，P=CP*rho*n³*D⁵；n 为每秒转数（RPM/60），D 单位米，V 为轴向来流 m/s，rho 单位 kg/m³。这些式子是推进关系，不是机身阻力公式；效率 eta=J*CT/CP 仅在适用条件下解释。静态数据无法单独确定前飞性能。

原始桨型、直径、桨距、转速与测试条件应匹配目标构型。当前尚未为团队机型筛选或拟合参数。

[官方索引与推荐引用](https://m-selig.ae.illinois.edu/props/propDB.html)；[完整包下载](https://m-selig.ae.illinois.edu/props/download/UIUC-propDB.zip)。原数据的镜像分发许可尚未独立确认，因此此处公开目录索引，不另行复制全部螺旋桨数据。
