# Magnetic assembly acceptance / 磁力吸附组装验收

Verified on 2026-10-03, Asia/Hong_Kong. Earlier manual-confirmation acceptance reports remain in the development workspace; this report describes the current workflow.

## Current behavior

Move a component within **0.9 schematic teaching units** of its own target and release. Eligible targets turn green during dragging. Release atomically sets the exact target position and orientation, installs and locks the component. Rotation no longer needs manual alignment. The scene interpolates the arrival over 280 ms; this is presentation only, with already exact persisted transforms, and reduced-motion preferences skip animation.

The former separate confirmation button was removed. Optional **Snap into place / 自动吸附到位** performs one-click assisted installation and is disabled when prerequisites are missing. Far-away or prerequisite-blocked placements remain loose. Scale/transform validity, installed locks and exploded mode still apply. A component only captures at its own slot, using three-dimensional distance including height. Mere selection, camera changes, reload and Undo do not trigger installation.

The completed drag-and-install is one history entry. A single Undo restores the position, orientation and loose state before the gesture. The UI, target labels, live readout, installation guide, bilingual operation instructions, step hints and README use the new workflow.

## Checks and evidence

- **175 tests passed in 7 files**, including 27 new magnetic-placement cases: all 17 targets with prerequisite chains, exact orientation correction, inclusive radius boundary, height, wrong target, blocked placement, installed/exploded locks, invalid values/scale, selection/view/undo behavior, exact persistence and immutable input.
- TypeScript and Vite production build passed: 55 modules, JavaScript 864.53 kB / 241.77 kB gzip. The existing bundle-size advisory remains; no dependencies were added.
- Actual production browser at port 4181 started with 3 previously installed frame/skid components. A motor placed 1.2 units from its seat remained loose. A real mouse drag moved it into capture range, and release increased progress to 4 without a confirmation click.
- That motor had a 90-degree yaw before capture. Its installed transform was exactly position `[-2.2, 2.36, -2.2]`, quaternion `[0, 0, 0, 1]`, scale `[1, 1, 1]`.
- History increased by exactly one for that drag-and-install. One actual Undo restored all parts byte-for-byte in the DOM-backed observation, including the motor's previous position, quaternion and loose status.
- A battery moved within 0.2 units of its target while its controller prerequisite was missing remained loose; the feedback named the required controller. One-click assistance was disabled.
- One-click assistance installed the motor again, then completed the remaining 13 components, reaching **17/17**. Production reload restored 17/17. This browser run was 3→17; all 17 magnetic transitions were independently covered by the rule tests.
- The old confirmation button count was zero. Browser console inspection returned no errors during these checks. Desktop verification used a temporary 1280×900 viewport; it was reset afterwards. The visible in-app preview also completed frame installation using the new assistance and retained its separate local progress.

Evidence: [Magnetic browser observations](outputs/magnetic-acceptance.json), [Completed magnetic assembly](outputs/magnetic-assembly.jpg).

## Scope

The capture radius is usability assistance for schematic teaching geometry, not mechanical fit tolerance. Legacy strict rule APIs remain available for module callers, but the integrated UI uses the new PLACE_PART transition. No original CAD, supplied archive/database, copied references, dependency caches, private notes or local worktree are published. No third-party website interface, flight physics, collision/electrical simulation or AI assessment was added. Offline-stop-service acceptance was not repeated for this iteration; earlier offline evidence applies to its earlier build.

# Detailed geometry and material acceptance / 精细模型与材质验收

Verified on 2026-10-03, Asia/Hong_Kong. The magnetic checks above describe the previous release; the following checks describe the detailed rendering upgrade.

## Result

All seven component kinds have detailed local geometry and distinct physical surfaces. Carbon decks/arms, metal fasteners and skids, open motor ribs/copper windings, closed twisted blade surfaces, reinforced nylon guards, controller headers/LED and battery fabric straps/connector/labels are visible in the production renderer. See MATERIALS.md for references and the visual assumptions. All 17 catalog teaching envelopes, mounting poses, prerequisites and magnetic rules remain unchanged. No CAD conversion or engineering-accuracy claim is made.

Local procedural weave, grain, fabric and printed labels require no remote assets. Studio PMREM reflections, ACES tone mapping, three directional lights and a 2048-square soft-filtered shadow map replace flat shading and per-mesh black outlines. Selection tint is restrained and restores the original LED emission. Textures, environment targets and shadow maps have explicit cleanup. Lightweight ghosts avoid duplicating the detailed geometry.

The bilingual Target assistance / 安装位辅助 display toggle defaults on. Turning it off hides all scene installation cues, including direction arrows and labels, for material inspection; turning it back on restores them. It does not change part state/history or remove magnetic capture. Exploded display also hides the cues while inspection is locked.

## Validation

- **178 tests passed in 7 files**. The 175 earlier assembly, persistence and guidance cases still pass. Three additional tests verify owned texture disposal, LED emission restoration, and finite closed two-blade surfaces with every indexed edge shared by exactly two triangles. Every detailed part remains within its declared size envelope.
- TypeScript and production build passed: 58 modules, JavaScript approximately 897 kB / 251 kB gzip. No dependencies were added. The existing 500 kB bundle advisory remains.
- Actual production browser at port 4181 began with 8 installed parts. Assisted installation and one exact Undo check passed, then the remaining 9 components completed **17/17**. Reload restored 17/17.
- With the completed detailed model, the battery was disassembled (16/17), then its actual body surface was dragged with the mouse. Releasing nearby automatically installed it (17/17). One Undo restored the entire DOM-observed part state byte-for-byte to the loose pre-drag state (16/17). Assistance restored 17/17; reload retained it. The existing history was at its 100-entry cap, so history length was not used as evidence of one entry.
- Material-inspection toggling preserved both part state and history. Hidden scene cue layer and restored cue layer were observed. The English control was verified after language switching. Exploded display preserved installed part transforms.
- Desktop visual inspection used a temporary 1280×900 viewport at DPR 2. Carbon/fabric detail, metal highlights, motor winding gaps, blade surfaces, connectors and shadows were inspected in whole-aircraft and close views. At 370×616, the document width was 365, canvas 365×250, and the display popup right edge 355; no horizontal overflow. The temporary viewport was reset.
- Several warmed-up visible frame-counter samples were about 105–120 FPS on the current Apple M5/ANGLE Metal browser. This is not a sustained performance benchmark or evidence for other devices. Initial shader compilation can temporarily reduce the displayed frame rate.
- Browser warning/error inspection returned an empty list during these checks. The visible in-app page was refreshed to the new material-model banner and retained its separate 1/17 progress.

Evidence: [Whole assembly](outputs/material-assembly.jpg), [Material close view](outputs/material-closeup.jpg), [Browser observations](outputs/material-acceptance.json).

The current iteration did not repeat offline-stop-service or context-loss recovery acceptance. Earlier evidence applies to its earlier build. Original CAD, manufacturer PDFs, other supplied reference files, dependency caches, private notes and the publication checkout are excluded from the public source release.
