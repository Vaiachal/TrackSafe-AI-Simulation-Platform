export type Weather = 'clear' | 'fog' | 'rain';
export type TimeOfDay = 'day' | 'night';
export type Terrain = 'forest' | 'rural' | 'curve' | 'straight';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ObjectType = 'elephant' | 'cattle' | 'deer' | 'human';

export type ObjectState = 'APPROACHING_TRACK' | 'ON_TRACK' | 'CROSSING' | 'MOVING_AWAY' | 'CLEAR_OF_TRACK';
export type BehaviorMode = 'towards' | 'away' | 'crossing' | 'stationary' | 'hybrid' | 'random';
export type ObjectSpeed = 'slow' | 'medium' | 'fast' | 'random';
export type SpawnTiming = 'early' | 'normal' | 'late' | 'random';

export interface SimulationObject {
  id: string;
  type: ObjectType;
  distance: number; // meters from train
  lateralOffset: number; // meters from track center
  speed: number; // m/s
  direction: number; // angle in radians
  detected: boolean;
  confidence: number;
  classification: ObjectType | 'unknown';
  state: ObjectState;
  previousState?: ObjectState;
  previousDistance: number;
}

export type FailureMode = 'none' | 'sensor_failure' | 'false_positive' | 'missed_detection' | 'delayed_detection';
export type Scenario = 'wildlife' | 'human' | 'sudden_obstacle' | 'custom' | 'custom2';
export type EntryPosition = 'left' | 'right' | 'center' | 'random';
export type MovementDirection = 'towards' | 'parallel' | 'crossing';
export type TrackType = 'straight' | 'mild_curve' | 'sharp_curve';

export interface CustomScenarioConfig {
  objectType: ObjectType;
  objectCount: number;
  entryPosition: EntryPosition;
  movementDirection: BehaviorMode;
  objectSpeed: ObjectSpeed;
  spawnTiming: SpawnTiming;
}

export interface ObjectConfig {
  entryPosition: EntryPosition;
  movementDirection: BehaviorMode;
  objectSpeed: ObjectSpeed;
  spawnTiming: SpawnTiming;
}

export interface Custom2ScenarioConfig {
  allowedObjectTypes: ObjectType[];
  objectConfigs: Partial<Record<ObjectType, ObjectConfig>>;
  continuousIntrusion: boolean;
  spawnInterval: number; // seconds (legacy or base)
  spawnIntervalRange: { min: number, max: number };
  maxObjects: number;
  trackType: TrackType;
}

export interface SimulationMetrics {
  totalDetected: number;
  totalAlerts: number;
  collisionsAvoided: number;
  collisionsOccurred: number;
  detectionAccuracy: number;
  totalSpawns: number;
}

export interface SimulationParams {
  trainSpeed: number; // km/h
  brakingDeceleration: number; // m/s^2
  reactionDelay: number; // seconds
  weather: Weather;
  timeOfDay: TimeOfDay;
  terrain: Terrain;
  sensorAccuracy: number; // 0-1
  aiConfidenceThreshold: number; // 0-1
  isAISystemEnabled: boolean;
  isMuted: boolean;
  failureMode: FailureMode;
  simulationSpeed: 1 | 2 | 5;
  scenario: Scenario;
  customConfig?: CustomScenarioConfig;
  custom2Config?: Custom2ScenarioConfig;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'warning' | 'error';
}

export type BrakingLevel = 'none' | 'gradual' | 'emergency';

export interface SimulationState {
  isRunning: boolean;
  currentTime: number; // seconds
  trainPosition: number; // meters
  trainCurrentSpeed: number; // m/s
  isBraking: boolean;
  brakingLevel: BrakingLevel;
  objects: SimulationObject[];
  riskScore: number; // 0-100
  timeToCollision: number | null;
  stoppingDistance: number; // meters
  alerts: string[];
  logs: LogEntry[];
  narration: string;
  isSpeaking: boolean;
  isMuted: boolean;
  collisionOccurred: boolean;
  collisionAvoided: boolean;
  metrics: SimulationMetrics;
  failureReason?: string;
}

export interface SimulationResult {
  id: string;
  timestamp: number;
  params: SimulationParams;
  success: boolean;
  reactionTime: number;
  stoppingDistance: number;
  minDistanceToObject: number;
  falsePositives: number;
  missedDetections: number;
  collisionProbability: number;
}

export interface AnalyticsData {
  totalRuns: number;
  successRate: number;
  avgReactionTime: number;
  avgSafetyImprovement: number;
  riskHeatmap: { zone: string; risk: number }[];
}
