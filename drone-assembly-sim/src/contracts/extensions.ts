import type { AssemblyAction, AssemblySnapshot, InstallationCheckResult, PartDefinition, Transform, Vector3 } from './index';
/** Future integrations only. No service, hardware, flight physics or AI is activated by these types. */
export interface TrainingContext {
  sessionId: string;
  snapshot: AssemblySnapshot;
  definitions: readonly PartDefinition[];
  modelAccuracy: 'simplified-teaching' | 'validated-engineering';
}
export interface ExperimentScenario {
  id: string;
  name: string;
  nameEn: string;
  bounds: Vector3;
  obstacles: { id: string; kind: 'box' | 'cylinder'; transform: Transform; size: Vector3 }[];
  /** Real hardware measurements require an explicit source/calibration record. */
  calibrationReference?: string;
}
export interface EnvironmentPort {
  loadScenario(scenario: ExperimentScenario, context: TrainingContext): Promise<void>;
  dispose(): void;
}
export interface DeviceTelemetry {
  timestamp: string;
  deviceId: string;
  position?: Vector3;
  batteryPercent?: number;
  armed: boolean;
}
export interface DeviceBridgePort {
  /** Connecting is a future, explicit user action. There is no implicit device discovery. */
  connect(endpoint: string): Promise<void>;
  subscribe(callback: (sample: DeviceTelemetry) => void): () => void;
  disconnect(): Promise<void>;
}
export interface FlightControlInput { throttle: number; roll: number; pitch: number; yaw: number }
export interface FlightSimulationPort {
  prepare(context: TrainingContext, scenario: ExperimentScenario): Promise<void>;
  start(): void;
  setInput(input: FlightControlInput): void;
  pause(): void;
  stop(): void;
  dispose(): void;
}
export interface TrainingEvent {
  timestamp: string;
  action: AssemblyAction;
  accepted: boolean;
  feedback?: InstallationCheckResult;
}
export interface TrainingReview { observations: { code: string; text: string; textEn: string; relatedPartIds: string[] }[]; recommendations: string[]; provenance: 'deterministic' | 'model-assisted'; modelName?: string }
export interface TrainingAssessmentPort {
  evaluate(context: TrainingContext, events: readonly TrainingEvent[]): Promise<TrainingReview>;
}
export interface ExtensionPorts {
  environment: EnvironmentPort;
  deviceBridge: DeviceBridgePort;
  flightSimulation: FlightSimulationPort;
  trainingAssessment: TrainingAssessmentPort;
}
export type ExtensionId = keyof ExtensionPorts;
