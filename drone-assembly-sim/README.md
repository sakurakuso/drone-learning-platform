# Drone Lab · Assembly Studio / 无人机组装工作台

Local, interactive 3D drone assembly teaching demo. English is the default UI; use **中文** to switch instantly. React + TypeScript + Vite + Three.js; all runtime dependencies and geometry are local.

**Simplified educational model based on existing component references / 基于现有部件资料的简化教学模型。** CAD is not converted or parsed. Every dimension, orientation, installation position, prerequisite and tolerance is an explicit teaching assumption. This demo does not accurately reproduce the source aircraft's dimensions or assembly relationships, and is not an engineering assembly guide.

## Run locally / 本地启动

```sh
git clone https://github.com/sakurakuso/drone-learning-platform.git
cd drone-learning-platform/drone-assembly-sim
npm ci --cache .npm-cache
npm run dev
```

Open <http://127.0.0.1:5173>. `start.command` starts the same development server. Node.js is required. After installation, dependencies are under `node_modules/`; the lock file is `package-lock.json`, and npm's cache stays in `.npm-cache/`. For a fresh online installation use `npm ci --cache .npm-cache`; an offline reinstall is possible only when all required cache entries are present (`npm ci --offline --cache .npm-cache`). Running an already installed build needs no external network.

For the production demo, including the offline cache:

```sh
npm run build
npm run preview
```

Open <http://127.0.0.1:4173>. `preview.command` runs those two commands. Wait for **Offline ready** after the first visit. The production service worker caches this build's HTML, JS and CSS on the same local origin, so refresh can work even when browser networking is set to Offline. Saved progress is origin-specific: development port 5173 and production port 4173 have separate progress.

Keep the local server running for normal use. Offline cache is a convenience for an already visited production origin, not a distributable application installer. Changing the host or port creates a new origin that needs its own initial visit. Development HMR is not cached. After rebuilding, allow the updated service worker to activate and refresh again if the old build is still visible.

## Assembly workflow / 使用流程

1. Start with the named mounting point already visible in the 3D scene, or press **Start: locate the main frame / 开始：定位主机架**. Click a target label, a library part or a marker in the top-view mounting map to select it. Selection alone never moves or installs a part. Each instance has its own stable ID.
2. **Locate mounting point / 定位安装位** frames the selected component and its target. The blue FRONT arrow defines aircraft front; LEFT/RIGHT are aircraft sides. The guide describes the seat, direction and any prerequisites, with clickable prerequisite navigation. Drag the part or the translation axes. Choose **Rotate / 旋转** to use the rotation rings. The collapsed **Advanced: position & rotation / 高级调整** accepts X/Y/Z positions and Euler angles in degrees; click **Apply transform / 应用位置与旋转** to commit one action.
3. **Align to target / 对齐安装位置** offers teaching assistance. It only moves the part; it does not install it or bypass dependency checks.
4. **Check & install / 检查并安装** checks prerequisites, scale, position and angle tolerance, then snaps a valid component to the assumed target.
5. Guided assembly recommends seven stages. Free assembly lets you choose the order while preserving the same dependency and tolerance rules.
6. **Disassemble / 拆卸** rejects removal when installed components depend on the selected part. Remove dependent components first. A detached component remains at its installation position and becomes movable.
7. **Undo / 撤销** restores one assembly action. Selection, camera, mode and exploded-view settings do not consume assembly history. Up to 100 snapshots are saved; reset is also undoable.
8. **Exploded view / 爆炸图** changes the presentation only. Its slider controls separation from 1% to 100%; **Isolate part / 隔离零件** and **Hide guards / 隐藏保护架** aid inspection. These display settings do not create assembly history. Refresh retains exploded mode with full separation and restores normal visibility.  Real component transforms and installation flags stay unchanged. Editing and installation controls are disabled until you return to assembly view.

The default scene shows the current step plus the explicit selection. **All mounting points / 全部安装位** shows remaining targets, with a scrollable label dock when they cannot fit without overlap. Blue outlines invite alignment, amber labels explain missing prerequisites, and green labels confirm readiness or installation. Text and symbols accompany colors. The dashed path and scene readout update during a drag; the inspector compares the committed transform after release. Target position and tolerance are read from the same catalog and numerical helpers as the installation rules.

Narrow browser panels stack the complete canvas above the library and inspector, rather than cutting it off horizontally.

Camera: drag empty space to orbit, scroll to zoom, right-drag to pan. Presets: Perspective, Top, Front and Side. Installed components are locked against movement. The frame counter reports measured rendered FPS for this Mac and browser; it is not a performance guarantee for other devices.

## Detailed controls / 详细操作说明

The **How to operate / 操作说明** button above the scene opens a bilingual guide. It explains selection, free dragging, axis and plane handles, rotation rings, camera controls, numeric input, installation, locks and recovery. A contextual hint below the toolbar changes with selection, Move/Rotate mode, installed state and exploded view.

### 移动器件

1. 点击零件库中的器件或场景中的实体器件，再点击上方 **移动**。点击 **定位安装位** 可同时看见器件和安装目标；它只调整镜头。
2. 把鼠标放在实体器件上，按住左键拖动，松开提交。拖动在当前镜头的屏幕平面内进行，可能改变高度；拖空白处则转动镜头。安装位的半透明轮廓不能作为实体器件拖动。
3. 精确调整时，按住红 **X**、绿 **Y**、蓝 **Z** 箭头的轴杆或尖端拖动，只沿该轴移动；拖两轴之间的小方块则在两轴平面内移动。X 为左右，Y 为上下，Z 为前后。机头 FRONT 为 −Z，飞机左为 −X，右为 +X；视角转动不会改变这些方向。
4. 例如把左前动力组件拖到目标附近，用绿 Y 调高度，再用红 X、蓝 Z 调整左右和前后。结合俯视、侧视检查，避免一个视角看似重合却存在高度误差。
5. 拖动过程中看场景虚线和距离，松开后看安装位指南的数值。一次完整拖动只记录一次装配操作，拖错可 **撤销**。自由拖动不会自动吸附或安装。

### 旋转与数值调整

点击 **旋转**，按住彩色旋转环沿圆周拖动，松开提交。红/绿/蓝环分别绕 X/Y/Z 轴旋转；绿色 Y 环可改变水平朝向。在旋转模式直接拖实体不会平移。位置合格但方向不合格时，调整旋转环直到角度进入容差。展开 **高级调整：位置与旋转** 可输入位置和旋转角（度）；必须点击 **应用位置与旋转** 才生效。

### 镜头与安装

空白处左键拖动环绕，滚轮缩放，右键拖动平移；用菜单切换透视、俯视、正视、侧视。镜头操作不改变器件变换。手动对齐后，或用 **对齐安装位置** 辅助后，仍需点 **检查并安装**。前置零件未安装时不会通过；点击指南内的前置零件可选择并定位它。

### 拖不动时

已安装件先 **拆卸**；有已安装的依赖件时先拆依赖件。爆炸图中操作锁定，退出后继续。确认已选择正确编号、处于移动模式、器件未被隐藏；重叠时从零件库选择。重置可以撤销；保存与刷新恢复仍按当前浏览器地址区分。

## Parts, references and state / 零件、参考与保存

The first model has 17 parts: 1 main frame, 2 landing skids, 4 motors, 4 propellers, 4 guards, 1 flight controller and 1 battery. Teaching position tolerance is 0.18 units and angle tolerance is 10°. Y is up; quaternions use `[x,y,z,w]`.

The separate bilingual [17-component list](PARTS_LIST.md) provides every stable ID and source reference. The full catalog is defined in `src/data/parts.ts`.

The original development workspace retains seven referenced SolidWorks files and their integrity manifest under `inputs/references/`. These CAD files and the retained reference website are excluded from this source repository; component filenames remain in the catalog as provenance labels. The program runs without these reference files. Reference CAD files are never served as runtime geometry; the demo creates simplified primitives locally and does not require a CAD license, CAD conversion, CDN, API key or cloud service.

Progress is saved after every accepted state change using `localStorage` key `drone-assembly-sim:progress:v1`. The UI restores component transforms, installation flags, selection, mode, view and undo history. It validates the schema version, catalog signature, complete component ID set, finite numbers, unit quaternions, positive scale, installed transforms, dependencies and every history snapshot before restoring. Incompatible/corrupt saves start a new workbench with a visible warning; denied storage shows a warning and keeps the current session usable. This is single-browser local progress, not account synchronization. Simultaneous tabs do not merge their edits.

## Module boundaries / 模块边界

- `src/contracts/index.ts`: authoritative shared interfaces.
- `src/data/`: the assumed component catalog and bilingual teaching steps.
- `src/scene/`: Three.js scene adapter from the scene window.
- `src/assembly/`: pure assembly rules and tests from the rules window.
- `src/integration/modules.ts`: factory imports; final module switch happens here.
- `src/state/`: UI persistence validation and round-trip tests.
- `src/ui/`, `src/App.tsx`: bilingual controls, state connection and feedback.
- `COORDINATION.md`: ownership, entry points and interface-change history.
- `VERIFICATION.md`: actual build, test and browser acceptance evidence.

```sh
npm test
npm run build
npm audit
```

## Limits / 边界

This is an educational assembly demonstration. It has no CAD constraint solver, collision checking, screw/thread simulation, electrical validation, real aircraft calibration or flight simulation. Similar-looking instances are distinguished by IDs and their assumed target positions. Align assistance can make placement immediate, but all installation rules still run. Real hardware assembly and flight require validated engineering references outside this demo.
