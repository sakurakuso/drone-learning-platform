# Final acceptance / 最终验收

Verified on 2026-10-03, Asia/Hong_Kong, using the integrated production build in Chrome on the development Mac.

## Result

Accepted as a simplified educational assembly demonstration. All geometry, dimensions, quadcopter layout, positions, orientations, dependencies and tolerances remain teaching assumptions. CAD was not converted. Flight simulation, hardware integration and AI assessment are not implemented.

## Corrections made during final review

- Connected the scene module's explosion slider, selected-part isolation and guard visibility controls to the main bilingual interface.
- Tightened saved-state validation: installed parts must remain at the exact snapped target, rather than merely within loose-part placement tolerance. Added a regression check for shifted and rotated installed parts.

## Checks performed

- Five test files, **101 tests passed**.
- A clean source-only export installed from the local npm cache and passed the same 101 tests and production build without CAD, website snapshots or original workspace files.
- TypeScript and Vite production build passed.
- npm audit reported **0 vulnerabilities** at review time.
- All seven retained CAD reference files and their original files matched the recorded SHA-256 digests. CAD references and the website snapshot remain local and are excluded from the GitHub repository.
- Actual browser controls completed **17/17** parts; missing prerequisites, wrong position and wrong orientation were rejected.
- Actual canvas dragging created one history entry; Undo restored the original parts.
- Dependent removal was rejected; battery removal and Undo succeeded.
- Free assembly reinstall, reset cancellation, reset and Undo, bilingual switching and camera presets succeeded.
- Explosion slider responded to actual keyboard input; isolation and guard hiding changed the rendered scene without changing assembly parts or history. Refresh retained parts, history and exploded mode; display-only settings reset as documented.
- With the review preview server stopped and its local endpoint unreachable, cached reload, battery removal and Undo succeeded. This verifies cached local-origin operation, not a system-wide Wi-Fi isolation test. Earlier browser network isolation evidence remains in the local development workspace.
- Chrome console inspection returned no errors or warnings during the final run.

Current foreground UI samples reported about **120 FPS / 8.3 ms** during this review, above the 30 FPS target. This is the app's frame counter on this Mac and viewport, not a sustained benchmark or a guarantee for other devices.

## Evidence

- [Final browser checks](outputs/final-acceptance.json)
- [Final assembled workbench](outputs/final-acceptance.jpg)
- Reproducible scene harness: `npm run dev`, then `/src/scene/verification.html`.

The production bundle is approximately 818 kB (225 kB gzip), producing Vite's non-blocking size warning. Runtime resources are local; install dependencies once with `npm ci --cache .npm-cache` before local use. Offline cache requires a successful first production visit at the same origin.

Repository scope: source, lock file, configuration, tests, startup scripts, documentation and final app-only verification evidence. Source CAD, copied website content, dependencies, caches and unrelated project files are excluded.
