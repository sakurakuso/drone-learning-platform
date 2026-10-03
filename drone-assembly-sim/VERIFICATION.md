# Mounting guidance acceptance / 安装位体验验收

Verified on 2026-10-03, Asia/Hong_Kong. This replaces the earlier first-release acceptance summary; earlier evidence remains in the development workspace.

## Change and result

The previous model only previewed a target after selecting a part. The new scene shows named mounting sites before selection, with outlines, rings, crosshairs, aircraft FRONT/LEFT/RIGHT references and clickable labels. The current teaching phase and selected part are shown by default; the all-sites view uses a scrollable label dock when necessary. A dashed path, distance and orientation readout assist placement. Camera location, prerequisite navigation, a three-stage guide and a top-view map explain what to do next. Numeric transform controls are collapsed by default.

The central deck, arms, motor seats, screws, motor vents, controller chip/pins, battery straps and guard supports are schematic teaching details, not converted CAD or engineering fits. All original target positions and installation tolerances are retained.

The unused reference-site extension types, empty registry and EXTENSIONS.md were removed at the user's request. They had never connected to a third-party service. Runtime source contains no outbound API, socket or third-party website integration. SVG namespace strings identify SVG elements and do not make network requests.

## Checks

- **148 tests passed in 6 source test files.** A dedicated Vitest configuration excludes copied release checkouts so tests are counted once.
- TypeScript and Vite production build passed. JavaScript is about 849 kB, 235 kB gzip; Vite reports its non-blocking bundle-size advisory.
- Existing geometry-envelope checks pass for all 17 parts. Ordinary Line resources added for paths/arrows are disposed, with a regression check.
- 46 mounting-guidance regressions compare against public installation rules, covering all 17 target poses, boundaries, q/-q, small angles, scale, prerequisites, invalid previews, phase changes and undo/reset.
- Actual Chrome UI completed **17/17** in both development and the production preview at port 4181. Production reload restored all 17 installed components and selection.
- Missing battery prerequisites were rejected and displayed as clickable required components. Clicking a prerequisite selected it without installation.
- An exactly aligned frame showed ready. A 20-degree yaw with correct position showed a separate direction warning; installation was rejected. Alignment assistance moved the part but did not install it.
- Actual motor dragging created one history entry. A single Undo restored every component's installation flag and all transform values; object-key serialization order is immaterial.
- With three components installed, the scene showed four distinct motor sites. The all-sites control showed all 14 remaining targets with blocked prerequisites labeled.
- Production desktop testing at 1280 x 900 found **zero overlaps** among the four motor labels and the FRONT/LEFT/RIGHT direction labels. The temporary desktop viewport override was used for breakpoint validation.
- Actual 365- and 744-pixel browser panels displayed the complete canvas after a responsive-layout correction. Narrow layout stacks the canvas above the library/inspector rather than clipping it sideways.
- Explosion mode hid mounting invitations and disabled installation; its guide explicitly remained inspection-only. Returning to assembly restored the mounting hints.
- English/Chinese switching and camera presets worked. Browser console inspection returned no errors or warnings during normal online operation.
- The scene window additionally verified target selection, first-gesture dragging, isolation/guard hiding retaining targets, repeated mount/dispose and cleanup: target DOM removed, geometry/texture counts zero and no scene-listener residue.

During the foreground UI checks, the frame counter generally showed approximately 118–121 FPS on this Mac. This is a local sample, not a sustained benchmark or a guarantee on other hardware. Transient drag guidance shares the rule's numerical checks; the inspector explicitly reports the committed transform after release.

## Evidence and scope

- [Browser observations](outputs/guidance-acceptance.json)
- [Four motor sites and direction references](outputs/guidance-motor-targets.jpg)
- Local scene harness: start the development server and open `/src/scene/verification.html`.

No new dependencies were added. The published update contains simulator source, configuration, lock file, documentation and app-only evidence. Original CAD, copied reference sources, the supplied archive's database and runtime environments, caches, dependencies and private notes are excluded. The existing course platform is separate. This iteration does not convert CAD or implement flight physics, collision, hardware linkage or AI assessment. Prior offline-cache checks belong to the first-release evidence; this iteration retains the local cache mechanism.

## Detailed operation guide acceptance — 2026-10-03

Added a bilingual **How to operate / 操作说明** dialog with five sections: free/axis/plane translation, rotation rings and numerical input, camera controls, installation confirmation/prerequisites, and locks/recovery. A contextual hint above the canvas distinguishes object movement from empty-space camera dragging and changes with selection, mode and locking. README contains the corresponding detailed controls. The instructions were checked against the actual pointer handlers, camera-plane drag, world-space transform controls and application actions.

Production build passed (54 modules; JavaScript 861.99 kB, 240.74 kB gzip), with the existing size advisory. All 148 existing tests passed; no new test machinery or dependencies were added for this UI/copy change. On the actual production preview at port 4181, Chinese and English dialogs opened, expanded sections rendered, Move/Rotate hints changed correctly, and Escape closed the dialog and returned focus to its opener. Opening/closing the guide left all transforms, installation flags and undo history unchanged. Actual 370×616 and 750×625 viewports showed a contained dialog with internally scrollable content and no horizontal overflow. Local screenshot: `outputs/operation-help.jpg` (development evidence, excluded from the source publication). No new full-assembly or offline claim is made by this narrow follow-up.
