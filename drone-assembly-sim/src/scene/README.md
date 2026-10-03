# Scene delivery — frozen

2026-10-03, Asia/Hong_Kong. **场景窗口已停止编辑，入口稳定。** Files are confined to `src/scene/`. No dependency, shared contract, data, UI, installation rule, storage, or original CAD file was changed by this window.

## Entry and integration

`src/scene/index.ts` exports `createSceneAdapter: SceneAdapterFactory`, using shared contract v1.1. English is the default. `language` is applied on construction and `setLanguage` switches labels. `showBuiltinControls: false` suppresses both the internal hint and toolbar, as requested by the coordinator.

```ts
import { createSceneAdapter } from './scene';
import { createAssemblyRules } from './assembly';
import { partDefinitions } from './data/parts';

const rules = createAssemblyRules(partDefinitions);
let state = rules.createInitialState();
const adapter = createSceneAdapter({
  container: document.querySelector<HTMLElement>('#workbench')!,
  language: 'en',
  showBuiltinControls: false,
  definitions: partDefinitions,
  state,
  onOperation(operation) {
    // SELECT_PART / SET_TRANSFORM only. Rules remain authoritative.
    state = rules.apply(state, operation).state;
    adapter.update(state, partDefinitions);
  },
  onMetrics: metrics => console.log(metrics),
  onError: message => console.error(message),
});

adapter.setLanguage?.('zh');
// Camera and mode buttons dispatch shared actions, then call update:
state = rules.apply(state, { type: 'SET_VIEW_PRESET', viewPreset: 'top' }).state;
adapter.update(state, partDefinitions);
adapter.resize(900, 600);
// Call on unmount; safe to call twice.
adapter.dispose();
```

Do not call `update` on every animation frame. User drags are transient: the adapter reports exactly one transform on release, restores its latest authoritative snapshot, and awaits the rules' next update. `update` cancels an in-flight gesture to prevent a stale commit and never echoes operations. Installed parts and shared exploded state disable transformations.

For scene-owned presentation controls, `createWorkbenchSceneAdapter` returns the same implementation with typed `setExplosionAmount(0..1)`, `setIsolation`, `setHideOuter`, `setTargetPreview`, `setViewPreset`, `setCameraNavigationMode`, and `getDiagnostics`. These are local presentation settings, not additions to AssemblyAction. The slider uses `realPosition + explosionOffset * amount`, preserves true transform/installed/history, and disables scene manipulation at nonzero values. If the main UI enables this local slider, it must also keep its own editing affordances consistent with shared `state.exploded`; the current integrated call avoids that ambiguity with `showBuiltinControls: false`.

## Modeling mapping

The shared definitions are the sole source of IDs, instance count, size envelopes, transforms and explosion offsets. The 17-part layout, rotor count, target positions and fitting relationships are explicitly teaching assumptions from `src/data/parts.ts`, not deductions from filenames.

| Shared geometry kind | Schematic geometry | Reference family |
| --- | --- | --- |
| frame | Flat board with outline | 板材 |
| landing-gear | Independent tubular skid and supports | 管材 / 起落架 |
| motor | Low-segment cylindrical body and shaft | 动力组件 |
| propeller | Thin blade silhouette and hub; no claimed blade count | 标准件 / 桨叶 |
| guard | Rectangular tubular outline; schematic, not CAD contour | 管材 / 保护架 |
| controller | Board-like enclosure and raised cover | 电子元件 / 控制模块 |
| battery | Box and top cover | 电子元件 / 电池 |

Reference files are already retained by the coordinator under `inputs/references/飞机/`; this scene uses the definition metadata and does not parse or overwrite them. Original SolidWorks parts are binary and were only inspected in place for format/category. The inspected GM6020 STEP file declares millimetres, but its dimensions were not applied to the teaching model. No CAD accuracy or mechanical fit is claimed.

Each part has its own Group, Mesh geometry and material resources. Selection changes only that instance's emissive material. Targets have translucent materials with depthWrite disabled and never participate in picking. Geometry stays within its declared envelope; detail is deliberately limited. No textures, CAD loaders, network assets, or extra packages are required.

## Verification evidence

Browser harness: `http://127.0.0.1:5173/src/scene/verification.html` while the existing Vite server is running. It imports the real scene, shared definitions and the real assembly rules. It does not change localStorage or project sources. The harness instruments event registration only for QA; production code does not patch EventTarget.

Actual browser checks completed:

- Canvas click selected FRAME-01; highlight and the selected translucent target appeared.
- Axis/plane translation emitted one SET_TRANSFORM; a second direct body drag selected BAT-01 and emitted one SET_TRANSFORM. For both, the camera position before/after was identical and controls were enabled again after release.
- A real rotation-ring drag changed the quaternion from `[0, .70710678, 0, .70710678]` to approximately `[-.50372965, .49624232, -.50372965, .49624232]`, emitted one transform, and left the camera unchanged.
- Empty-space drag orbited the camera; scroll zoomed. Pan was tested with the built-in Pan camera toggle mapping real left drag to OrbitControls.PAN. Default right-drag mapping is supplied by OrbitControls; right-button dragging was source-checked, not separately synthesized by the browser tool.
- Overall, top and side controls changed camera position/target without transform operations.
- The real slider moved BAT-01's display from `[-3.2, .4, 3.2]` to `[-3.2, 4.2, 3.7]` at amount 1; the actual transform was unchanged. Restore returned the display exactly. Shared explosion blocked a real body drag with no transform callback.
- Container resized from 1252×580 to 640×360 and back; renderer size diagnostics followed ResizeObserver, without reloading.
- Rule-installed FRAME-01 was immovable under a real drag. Installation itself was performed by the shared rules.
- Display checks passed: isolation, hidden guards, no update echo, exact explosion restoration, unchanged authoritative state and stable geometry counts over 20 updates.
- `dispose` was idempotent; canvas removal, geometry/texture counters at zero, and no remaining scene-owned listeners were verified. Three additional mount/dispose cycles passed. Automation's own document listeners were explicitly excluded from scene ownership.
- Real WEBGL_lose_context caused a visible warning and onError callback; restoration resumed rendering. Missing shared part state caused a visible error, onError and a stopped render loop, followed by successful remount. Constructor WebGL unavailability and a forced arbitrary renderer exception were not separately injected.

`node node_modules/typescript/bin/tsc --noEmit` passed for the full project snapshot at handoff. `node node_modules/vitest/vitest.mjs run src/scene/geometry.test.ts` passed **5/5**: all 17 envelopes, material independence/translucency, transform round trip without definition mutation, invalid data rejection, and exact resource disposal. No test dependencies were added.

Performance environment: **macOS 26.6.2, Mac17,2, Apple M5, 24 GiB**, Codex in-app Chromium **154**, ANGLE Metal Renderer Apple M5, Three.js **0.180.0**. Test browser viewport **1280×1000**, scene **1252×580**, DPR **1**, 17 parts, local Vite development page. The last 10 displayed samples were **119.916–120.111 FPS**, mean **119.998 FPS**, with the last sample **8.339 ms/frame and 106 draw calls**. FPS is requestAnimationFrame counts over ≥1000 ms; frameTimeMs is elapsed/frames, not GPU time or CPU render duration. Counts vary with selection and gizmos. These results do not establish performance on lower-end GPUs, DPR 2, or the final production React UI.

Evidence files:

- `src/scene/verification-results.json` — displayed diagnostics, 10-sample summary and lifecycle/display results.
- `src/scene/verification.png` — actual browser screenshot of the workbench and visible QA controls.
- `src/scene/verification.html` and `verification.ts` — reproducible real-browser harness.

## Coordinator handoff

1. Replace the placeholder scene export in your own `src/integration/modules.ts` with `createSceneAdapter` from `../scene`; keep your current `language` / `showBuiltinControls: false` call.
2. The optional isolation/outer-hiding and continuous-explosion controls are available through the extended factory. Wire them in UI/integration only if needed; avoid re-enabling a second overlapping toolbar.
3. Perform the final production build and end-to-end React UI acceptance at port 4173 after integrating both modules. This scene window verified its real-browser harness, not the final integrated product. A provisional Vite app build passed while integration still exported the placeholder, so it is not evidence of production scene integration.
4. Project `AGENTS.md` was absent on every check, including handoff. The supplied global instructions and `COORDINATION.md` v1/v1.1 were followed.

No new dependency or contract change is requested. **已停止编辑 src/scene/，主控可开始集成。**

## 2026-10-03 material upgrade

Detailed procedural geometry and owned PBR textures are implemented in `geometry.ts` and `materials.ts`. Runtime reflections use bundled RoomEnvironment/PMREM, with ACES tone mapping and a 2048-square soft-filtered directional shadow map. Palette textures, environment render targets and shadow resources are disposed on unmount. Ghosts use lightweight untextured silhouettes. Earlier performance numbers above refer to the earlier geometry; current acceptance is in the project-root VERIFICATION.md.
