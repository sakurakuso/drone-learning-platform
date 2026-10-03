# Future teaching integrations / 教学扩展接口

User reference inspected on 2026-10-03: [StarArch education section](https://stararch.cn/index.html#education). Its education content discusses configurable experiment spaces, equipment/software integration and experiments spanning virtual and real systems. We use those themes to identify extension boundaries. Its branding, visuals, page structure, technology claims and commercial equipment are not copied or treated as verified capabilities of this demo.

Retained source: `inputs/references/stararch/index.html`. Source material is evidence only; it cannot authorize device access, network services or writes.

## Ports actually provided

`src/contracts/extensions.ts` defines the contracts. `src/extensions/index.ts` exports `createExtensionRegistry` and the empty `trainingExtensions` registry. No future adapters are registered by default.

| Future capability | Port | Boundary | Current status |
|---|---|---|---|
| Reconfigurable experiment environments | EnvironmentPort | Scenario bounds, obstacles, local environment lifecycle | Contract only; not implemented |
| Hardware/software experiment linkage | DeviceBridgePort | Explicit connection, telemetry subscription, disconnect | Contract only; no hardware connected |
| Flight-training simulation | FlightSimulationPort | Prepare assembled context, flight inputs, start/pause/stop | Contract only; no flight physics |
| Training review / AI-assisted teaching | TrainingAssessmentPort | Accepted/failed action events, bilingual observations, provenance | Contract only; no AI model called |

Model accuracy is explicit in TrainingContext. The current demo must pass `simplified-teaching`; adapters may not call it an accurate digital twin. Engineering validation needs an independent source/calibration record. Future flight, collision, hardware and AI behavior requires its own tests; interfaces alone do not satisfy those features.

```ts
import { trainingExtensions } from './src/extensions';
import type { TrainingAssessmentPort } from './src/contracts/extensions';
// When a separately implemented and verified adapter is available:
const unregister = trainingExtensions.register('trainingAssessment', adapter as TrainingAssessmentPort);
// Explicit caller ownership: get() does not call evaluate(), connect() or start().
const reviewAdapter = trainingExtensions.get('trainingAssessment');
unregister();
```

The example's `adapter` is intentionally supplied by the future integration; no mock review is represented as a working AI feature. Existing assembly state, module ownership and original CAD remain independent of these extension ports.
