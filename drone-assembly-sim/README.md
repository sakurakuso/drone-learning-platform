# Drone Lab · Assembly Studio / 无人机组装工作台

Local, interactive 3D drone assembly teaching demo. English is the default UI; use **中文** to switch instantly. React + TypeScript + Vite + Three.js; all runtime dependencies and geometry are local.

**Real-world references · Detailed teaching model / 实物参考 · 精细材质教学模型。** CAD is not converted or parsed. Every dimension, orientation, installation position, prerequisite and tolerance is an explicit teaching assumption. This demo does not accurately reproduce the source aircraft's dimensions or assembly relationships, and is not an engineering assembly guide.

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

## Assembly workflow / 磁力吸附安装流程

1. Select a solid part, a library item or its mounting label. Selection does not install it. **Locate mounting point / 定位安装位** frames the part and its matching target without changing its position.
2. Choose **Move / 移动**, drag the part toward its named seat, and release inside the **0.9 teaching-unit capture radius**. The target turns green while eligible. Release automatically snaps to the exact catalog position, corrects orientation, installs and locks the component. The 280 ms arrival animation is presentation only; persisted transforms are already exact. Reduced-motion preferences skip it.
3. A part only captures at its own target. The distance is three-dimensional, including height. Missing prerequisites, invalid transforms, incorrect scale, installed locks and exploded mode prevent capture. A distant release or a prerequisite-blocked release remains a loose placement.
4. Optional **Snap into place / 自动吸附到位** performs one-click assisted installation. It is disabled until prerequisites are installed. There is no separate confirmation button.
5. The entire drag-and-install is one history entry. **Undo / 撤销** restores the previous position, orientation and installation flag in one step. Selection, camera and display settings do not create history or trigger installation. Undo, reload and a mere click do not re-install a loose component.
6. **Disassemble / 拆卸** unlocks a component at its installed position; installed dependents must be removed first. Guided mode recommends seven phases; Free mode preserves prerequisites and capture checks.
7. **Exploded view / 爆炸图** is inspection-only and locks editing. Isolate and hide-guard controls affect visibility. Default labels show the current phase and selection; **All mounting points / 全部安装位** shows remaining targets.

Blue means move closer; green means release to capture or already installed; amber means prerequisites are missing. Words and symbols accompany colors. The dashed path and scene readout update while dragging. The inspector shows the committed distance and explains automatic orientation correction.

## Detailed controls / 详细操作说明

The **How to operate / 操作说明** button opens a bilingual five-section guide. Contextual instructions above the canvas change with selection, Move/Rotate mode, installed state and exploded view.

### 移动器件与自动吸附

1. 从零件库按名称和编号选择器件，再点击 **移动**。找不到实体时点击 **定位安装位**；它只移动镜头。
2. 左键按住实体器件表面拖动，接近自己的安装位后松开。自由拖动沿当前镜头的屏幕平面进行，可能改变高度。拖空白处会转镜头；半透明安装轮廓不是实体。
3. 拖红 **X**、绿 **Y**、蓝 **Z** 箭头的轴杆或尖端可沿单轴移动；拖两轴之间的小方块可在对应平面内移动。X 左右、Y 上下、Z 前后；机头 FRONT 为 −Z，飞机左为 −X，右为 +X。镜头转动不会改变飞机方向。
4. 例如把左前动力组件拖到左前电机座附近，用绿 Y 调整高度，红 X、蓝 Z 调整左右和前后。进入 0.9 教学单位的三维吸附范围、且前置齐全时，位点变绿。
5. 松手后自动精准定位、校正朝向并安装，无需手动精调角度。远离位点松手则保持散件。误操作点一次 **撤销**，即可恢复整次拖动和安装。
6. 也可点 **自动吸附到位** 一键安装。前置不齐时按钮不可用，指南会列出必须先安装的器件。

### 自由旋转与数值调整

**旋转** 模式中，按住彩色旋转环沿圆周拖动，松开提交；红/绿/蓝环对应 X/Y/Z 轴。在此模式直接拖实体不会平移。旋转用于自由观察与练习，安装时朝向由吸附自动校正。展开 **高级调整：位置与旋转** 可输入位置和角度（度）；点击 **应用位置与旋转** 后才生效，若输入位置在吸附范围内也会自动安装。

### 镜头与拖不动时

空白处左键拖动环绕，滚轮缩放，右键拖动平移。用菜单切换透视、俯视、正视、侧视；这些操作不改变器件位置，也不触发安装。已安装件先 **拆卸**；有已安装的依赖件时先拆依赖件。爆炸图中操作锁定，退出后继续。确认器件未隐藏、选对编号且处于移动模式。重置可以撤销；刷新恢复和保存按当前浏览器地址区分。

Narrow panels retain the complete canvas above the inspector/library. The frame counter is a local sample, not a performance guarantee.

## Model detail and materials / 部件细节与材质

The model includes layered carbon decks, arm clamps, hex fasteners, motor ribs and copper windings, tapered twisted blade surfaces, curved metal skids, reinforced nylon guards, controller headers and a status LED, and a battery pack with woven straps, buckles, connector and printed markings. Carbon weave, brushed-metal grain, fabric and labels are generated locally. No remote texture service or HDR download is required.

Physical materials use different roughness and metalness values, with clearcoat on carbon surfaces. A local studio reflection environment, warm key light, cool fill, rim lighting, ACES tone mapping and soft shadow filtering make the surfaces easier to distinguish. Selection adds only a subtle tint; a controller LED retains its own emission. This is real-time rasterized rendering rather than offline ray tracing.

**显示选项 → 安装位辅助 / Display options → Target assistance** temporarily hides scene labels and target rings for inspecting materials. It defaults on, does not change installed transforms or history, and can be restored at any time. **Locate mounting point**, isolate and hide-guard controls help inspect an individual part. See [material design and references](MATERIALS.md) for the appearance assumptions and reference sources.

## Parts, references and state / 零件、参考与保存

The first model has 17 parts: 1 main frame, 2 landing skids, 4 motors, 4 propellers, 4 guards, 1 flight controller and 1 battery. Magnetic capture uses 0.9 teaching units and automatically corrects orientation. Legacy strict checks retain 0.18-unit and 10° tolerances for module integrations; they are not the UI installation workflow. Y is up; quaternions use `[x,y,z,w]`.

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

This is an educational assembly demonstration. It has no CAD constraint solver, collision checking, screw/thread simulation, electrical validation, real aircraft calibration or flight simulation. Similar-looking instances are distinguished by IDs and their assumed target positions. Automatic capture checks prerequisites and locks, then stores the exact target pose. Real hardware assembly and flight require validated engineering references outside this demo.
