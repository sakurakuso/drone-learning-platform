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
