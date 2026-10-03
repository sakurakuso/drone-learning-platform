# 物理模型与数值参数

parameters.csv 为从上游 JSON、URDF、SDF 中直接提取的数值与单位。原始文件保存在各项目子目录，许可证分别保留。所有模型锁定上游 commit，见 ../source_manifest.json。模型参数不是团队机型的实测数据。

| 模型 | 已保存文件 | 能力与接入限制 |
| --- | --- | --- |
| RCForge | 三种 Quad X JSON | 质量分布、旋翼、推力曲线、电池及方向性阻力。使用原引擎 schema；部分字段为估计，检查 provenance。视觉桨径不自动决定推进曲线 |
| PyBullet drones | cf2x、cf2p、racer URDF | 质量、惯性、kf/km、阻力、地效和下洗系数。默认系数面向该预设；URDF 引用的 DAE 网格与运行代码未随此目录复制，不能将参数快照当作完整可执行包 |
| PX4 Gazebo | x500、x500_base SDF | 基座惯性及四电机插件参数；x500 include 引用 x500_base，还依赖上游网格、Gazebo 插件和 PX4 配置，不是独立运行包 |
| FPV.Sim | 参数说明与源码链接 | 速度按 1-dragCoeff*dt 衰减，属于简化线性阻尼；不是经过实测拟合的机体 Cd |
| propwash | 默认 JSON5 与场景配置 | 质量、组合推力、各轴线性/二次阻力参数；角速度响应简化，不能声称等同真实 Betaflight |

## 空气阻力和旋翼关系

RCForge：F_i=-0.5*rho*(CdA)_i*abs(v_rel,i)*v_rel,i，气流转换至机体系；bodyDragAreaM2 是有效阻力面积，不能再无依据乘一次 Cd。固定翼的 CL/CD/CM 极曲线与四旋翼机身阻力是不同接口。

PyBullet：T=kf*RPM²，Q=km*RPM²；阻力方法以 sum(2*pi*RPM/60)、速度及 DRAG_COEFF 构造阻力。该系数不能当成无量纲 Cd；地效、阻力、下洗需相应 physics 模式启用。参考原代码中的 _drag、_groundEffect、_downwash，不在此处声称其任意姿态精度已验证。

PX4 Gazebo：电机模型使用角速度，须与 PyBullet 的 RPM 区分；替换推进系数时不能直接复制数值。插件依赖与参数公式见 [Gazebo MulticopterMotorModel](https://gazebosim.org/api/sim/9/classgz_1_1sim_1_1systems_1_1MulticopterMotorModel.html)。

FPV.Sim 上游 dragCoeff=0.4，代码在每步用 velocity *= 1-dragCoeff*dt。propwash 默认 mass=0.4 kg、maxCombinedThrust=30 N、dragForceOverSpeed=[0,0,0] N/(m/s)、dragForceOverSpeedSquared=[0.005,0.005,0.05] N/(m/s)²。它们是作者预设，不是团队设备的测量。

模型选择：比赛主线优先 RCForge，物理扩展研究可参考 PyBullet；PX4/Gazebo 适合已有该环境的团队。完整流场 CFD、旋翼相互作用和真实机型校准不在当前已验证范围内。
