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

1. Select a part from the left library or directly in the 3D scene. Each repeated instance has its own stable ID.
2. Drag the part or the translation axes. Choose **Rotate / 旋转** to use the rotation rings. The inspector also accepts X/Y/Z positions and Euler angles in degrees; click **Apply transform / 应用位置与旋转** to commit one action.
3. **Align to target / 对齐安装位置** offers teaching assistance. It only moves the part; it does not install it or bypass dependency checks.
4. **Check & install / 检查并安装** checks prerequisites, scale, position and angle tolerance, then snaps a valid component to the assumed target.
5. Guided assembly recommends seven stages. Free assembly lets you choose the order while preserving the same dependency and tolerance rules.
6. **Disassemble / 拆卸** rejects removal when installed components depend on the selected part. Remove dependent components first. A detached component remains at its installation position and becomes movable.
7. **Undo / 撤销** restores one assembly action. Selection, camera, mode and exploded-view settings do not consume assembly history. Up to 100 snapshots are saved; reset is also undoable.
8. **Exploded view / 爆炸图** changes the presentation only. Its slider controls separation from 1% to 100%; **Isolate part / 隔离零件** and **Hide guards / 隐藏保护架** aid inspection. These display settings do not create assembly history. Refresh retains exploded mode with full separation and restores normal visibility.  Real component transforms and installation flags stay unchanged. Editing and installation controls are disabled until you return to assembly view.

Camera: drag empty space to orbit, scroll to zoom, right-drag to pan. Presets: Perspective, Top, Front and Side. Installed components are locked against movement. The frame counter reports measured rendered FPS for this Mac and browser; it is not a performance guarantee for other devices.

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

## Future teaching integrations / 保留功能接口

The [StarArch education reference](https://stararch.cn/index.html#education) informed the separation of experiment environments, equipment/software linkage and experimental training. `src/contracts/extensions.ts` and `src/extensions/index.ts` reserve typed ports and an empty registry for environment configuration, hardware telemetry, flight simulation and training assessment. These four features are **not implemented or connected**. See `EXTENSIONS.md` for boundaries and integration examples. Website graphics and layouts are not copied.
