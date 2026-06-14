import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SimulationState, 
  SimulationParams, 
  SimulationObject, 
  RiskLevel, 
  ObjectType, 
  SimulationResult, 
  Scenario, 
  BrakingLevel,
  ObjectSpeed,
  SpawnTiming,
  BehaviorMode,
  EntryPosition,
  ObjectConfig
} from '../types';
import { ttsService } from '../services/ttsService';

const INITIAL_STATE: SimulationState = {
  isRunning: false,
  currentTime: 0,
  trainPosition: 0,
  trainCurrentSpeed: 0,
  isBraking: false,
  brakingLevel: 'none',
  objects: [],
  riskScore: 0,
  timeToCollision: null,
  stoppingDistance: 0,
  alerts: [],
  logs: [],
  narration: 'System Ready. Select a scenario to begin.',
  isSpeaking: false,
  isMuted: false,
  collisionOccurred: false,
  collisionAvoided: false,
  metrics: {
    totalDetected: 0,
    totalAlerts: 0,
    collisionsAvoided: 0,
    collisionsOccurred: 0,
    detectionAccuracy: 0,
    totalSpawns: 0,
  }
};

const DETECTION_DELAY = 0.75;
const DECISION_DELAY = 0.5;
const BRAKE_RESPONSE_DELAY = 1.5;
const TOTAL_REACTION_DELAY = DETECTION_DELAY + DECISION_DELAY + BRAKE_RESPONSE_DELAY;
const SAFETY_BUFFER = 2.0;

export function useSimulation(params: SimulationParams) {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(null);
  const lastSpawnTimeRef = useRef<number>(0);

  // Sync mute status with ttsService
  useEffect(() => {
    ttsService.setMuted(params.isMuted);
    setState(prev => ({ ...prev, isMuted: params.isMuted }));
  }, [params.isMuted]);

  const spawnObject = useCallback((type: ObjectType, distance: number, lateralOffset?: number, direction?: number, speed?: number): SimulationObject => ({
    id: Math.random().toString(36).substr(2, 9),
    type,
    distance,
    previousDistance: distance,
    lateralOffset: lateralOffset !== undefined ? lateralOffset : (Math.random() - 0.5) * 4, // within 2m of track center
    speed: speed !== undefined ? speed : Math.random() * 2,
    direction: direction !== undefined ? direction : Math.PI / 2 + (Math.random() - 0.5) * 0.5,
    detected: false,
    confidence: 0,
    classification: 'unknown',
    state: 'APPROACHING_TRACK',
  }), []);

  const getObjectSpeed = useCallback((speed: ObjectSpeed) => {
    const actualSpeed = speed === 'random' 
      ? (['slow', 'medium', 'fast'][Math.floor(Math.random() * 3)] as ObjectSpeed)
      : speed;
    if (actualSpeed === 'slow') return 1 + Math.random();
    if (actualSpeed === 'medium') return 3 + Math.random();
    if (actualSpeed === 'fast') return 5 + Math.random() * 2;
    return 2;
  }, []);

  const getSpawnDistance = useCallback((timing: SpawnTiming) => {
    if (timing === 'early') return 900;
    if (timing === 'normal') return 600;
    if (timing === 'late') return 300;
    if (timing === 'random') return 300 + Math.random() * 600;
    return 800;
  }, []);

  const getObjectDirection = useCallback((behavior: BehaviorMode, entry: EntryPosition) => {
    let dir = Math.PI / 2;
    const actualBehavior = (behavior === 'hybrid' || behavior === 'random')
      ? (['towards', 'away', 'crossing', 'stationary'][Math.floor(Math.random() * 4)] as BehaviorMode)
      : behavior;

    const actualEntry = entry === 'random'
      ? (['left', 'right', 'center'][Math.floor(Math.random() * 3)] as EntryPosition)
      : entry;

    if (actualBehavior === 'towards') {
      dir = actualEntry === 'left' ? Math.PI / 2 + 0.4 : actualEntry === 'right' ? Math.PI / 2 - 0.4 : Math.PI / 2;
    } else if (actualBehavior === 'away') {
      dir = actualEntry === 'left' ? Math.PI / 2 - 0.4 : actualEntry === 'right' ? Math.PI / 2 + 0.4 : Math.PI / 2 - Math.PI;
    } else if (actualBehavior === 'crossing') {
      dir = actualEntry === 'left' ? Math.PI / 2 + 0.8 : actualEntry === 'right' ? Math.PI / 2 - 0.8 : Math.PI / 2;
    } else if (actualBehavior === 'stationary') {
      dir = Math.PI / 2;
    }

    return { dir, actualBehavior, actualEntry };
  }, []);

  const createConfiguredObject = useCallback((type: ObjectType, config: ObjectConfig): SimulationObject => {
    const speed = getObjectSpeed(config.objectSpeed);
    const baseDist = getSpawnDistance(config.spawnTiming);
    
    const actualEntry = config.entryPosition === 'random'
      ? (['left', 'right', 'center'][Math.floor(Math.random() * 3)] as EntryPosition)
      : config.entryPosition;

    const lat = actualEntry === 'left' ? -5 - Math.random() * 2 : actualEntry === 'right' ? 5 + Math.random() * 2 : (Math.random() - 0.5) * 1;
    const { dir, actualBehavior } = getObjectDirection(config.movementDirection, actualEntry);
    const actualSpeed = actualBehavior === 'stationary' ? 0 : speed;
    return spawnObject(type, baseDist + Math.random() * 100, lat, dir, actualSpeed);
  }, [getObjectSpeed, getSpawnDistance, getObjectDirection, spawnObject]);

  const playAlertSound = useCallback((level: BrakingLevel) => {
    if (params.isMuted || params.scenario !== 'custom2') return;
    
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (level === 'emergency') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
      } else if (level === 'gradual') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn('Audio context failed', e);
    }
  }, [params.isMuted, params.scenario]);

  const startSimulation = useCallback((scenarioOverride?: Scenario) => {
    let initialObjects: SimulationObject[] = [];
    let initialNarration = '';
    const scenario = scenarioOverride || params.scenario;
    
    const weatherText = params.weather === 'clear' ? 'clear visibility' : params.weather === 'fog' ? 'dense fog' : 'heavy rain';
    const timeText = params.timeOfDay === 'day' ? 'daylight' : 'nighttime';
    const speedText = `${params.trainSpeed} km/h`;

    const initialMetrics = {
      totalDetected: 0,
      totalAlerts: 0,
      collisionsAvoided: 0,
      collisionsOccurred: 0,
      detectionAccuracy: 0,
      totalSpawns: 0,
    };

    switch (scenario) {
      case 'wildlife':
        initialObjects = [spawnObject('elephant', 800, -3, Math.PI / 2 + 0.2, 1.5)];
        initialNarration = `You are observing a forest corridor scenario in ${timeText} with ${weatherText}. The train is moving at ${speedText}. An elephant is approaching the track from the left. Based on speed and distance, a potential risk is developing.`;
        break;
      case 'human':
        initialObjects = [spawnObject('human', 600, 2, Math.PI / 2 - 0.1, 1.2)];
        initialNarration = `Intrusion detection active. A human is spotted near the tracks in ${weatherText} conditions. The train is cruising at ${speedText}. Monitoring for unauthorized movement towards the danger zone.`;
        break;
      case 'sudden_obstacle':
        initialObjects = [spawnObject('cattle', 300, 0, Math.PI / 2, 0)];
        initialNarration = `High-speed response test initiated. A sudden obstacle has appeared directly on the tracks at 300 meters. The system must now evaluate braking distance and issue immediate alerts.`;
        break;
      case 'custom':
        if (params.customConfig) {
          const { objectType, objectCount, entryPosition, movementDirection, objectSpeed, spawnTiming } = params.customConfig;
          for (let i = 0; i < objectCount; i++) {
            initialObjects.push(createConfiguredObject(objectType, { entryPosition, movementDirection, objectSpeed, spawnTiming }));
          }
          initialNarration = `Custom scenario initialized. Testing detection of ${objectCount} ${objectType}(s) with ${movementDirection} behavior. Environmental parameters: ${weatherText}, ${timeText}.`;
        }
        break;
      case 'custom2':
        initialNarration = "Advanced scenario mode active. Monitoring multiple dynamic objects.";
        lastSpawnTimeRef.current = Date.now();
        if (params.custom2Config) {
          const types = params.custom2Config.allowedObjectTypes;
          for (let i = 0; i < 2; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const config = params.custom2Config.objectConfigs[type] || {
              entryPosition: 'left',
              movementDirection: 'towards',
              objectSpeed: 'medium',
              spawnTiming: 'normal'
            };
            initialObjects.push(createConfiguredObject(type, config));
          }
        }
        break;
      default:
        initialObjects = [spawnObject('elephant', 800)];
        initialNarration = 'System active. Monitoring tracks for potential hazards.';
    }
    
    setState({
      ...INITIAL_STATE,
      isRunning: true,
      trainCurrentSpeed: params.trainSpeed / 3.6,
      objects: initialObjects,
      narration: initialNarration,
      metrics: { ...initialMetrics, totalSpawns: initialObjects.length },
      logs: [{ timestamp: Date.now(), message: `Simulation started: ${scenario}`, type: 'info' }]
    });
    
    // Initial scene narration
    ttsService.speak(initialNarration);
    
    lastTimeRef.current = performance.now();
  }, [params.trainSpeed, params.scenario, params.weather, params.timeOfDay, params.customConfig, spawnObject]);

  const stopSimulation = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  }, []);

  const resetSimulation = useCallback(() => {
    setState(INITIAL_STATE);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  }, []);

  const runMonteCarlo = useCallback((iterations: number = 100) => {
    const results: SimulationResult[] = [];
    for (let i = 0; i < iterations; i++) {
      // Simulate a run with random variations
      const randomParams = {
        ...params,
        trainSpeed: params.trainSpeed * (0.8 + Math.random() * 0.4),
        sensorAccuracy: params.sensorAccuracy * (0.9 + Math.random() * 0.1),
      };
      
      const success = Math.random() > (1 - randomParams.sensorAccuracy);
      const speedMS = randomParams.trainSpeed / 3.6;
      const stoppingDistance = (Math.pow(speedMS, 2)) / (2 * randomParams.brakingDeceleration);
      
      results.push({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        params: randomParams,
        success,
        reactionTime: TOTAL_REACTION_DELAY + (Math.random() * 0.5),
        stoppingDistance,
        minDistanceToObject: success ? 50 + Math.random() * 100 : 0,
        falsePositives: Math.random() > 0.95 ? 1 : 0,
        missedDetections: success ? 0 : 1,
        collisionProbability: success ? 0.05 : 0.95,
      });
    }
    return results;
  }, [params]);

  const update = useCallback((time: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const deltaTime = ((time - lastTimeRef.current) / 1000) * params.simulationSpeed;
    lastTimeRef.current = time;

    setState(prev => {
      if (!prev.isRunning || prev.collisionOccurred || prev.collisionAvoided) return prev;

      let { 
        trainCurrentSpeed, 
        trainPosition, 
        isBraking, 
        objects, 
        currentTime,
        alerts,
        logs,
        narration,
        collisionOccurred,
        collisionAvoided
      } = prev;

      currentTime += deltaTime;
      const newLogs = [...logs];
      let newNarration = narration;
      let newMetrics = { ...prev.metrics };
      let failureReason = prev.failureReason;

      // AI Detection Logic
      const updatedObjects = objects.map(obj => {
        const visibilityFactor = params.weather === 'clear' ? 1 : params.weather === 'fog' ? 0.2 : 0.5;
        const timeFactor = params.timeOfDay === 'day' ? 1 : 0.4;
        
        // Track Curvature Effect
        let curvatureFactor = 1.0;
        if (params.scenario === 'custom2' && params.custom2Config) {
          if (params.custom2Config.trackType === 'mild_curve') curvatureFactor = 0.8;
          if (params.custom2Config.trackType === 'sharp_curve') curvatureFactor = 0.5;
        }

        let detectionRange = 1000 * visibilityFactor * timeFactor * curvatureFactor;
        
        // Failure Mode: Sensor Failure
        if (params.failureMode === 'sensor_failure') {
          detectionRange *= 0.2;
          if (currentTime % 5 < 0.1) {
            newLogs.unshift({ timestamp: Date.now(), message: 'CRITICAL: Sensor degraded - Low visibility', type: 'error' });
            newNarration = `[SYSTEM] Sensor array degraded. Detection range reduced by 80%.`;
          }
        }

        // Failure Mode: Delayed Detection
        if (params.failureMode === 'delayed_detection') {
          detectionRange *= 0.5;
        }

        const isWithinRange = obj.distance < detectionRange;
        let detectionChance = params.sensorAccuracy * visibilityFactor * timeFactor;
        
        // Failure Mode: Missed Detection
        if (params.failureMode === 'missed_detection') {
          detectionChance = 0;
        }

        let detected = obj.detected;
        let confidence = obj.confidence;
        let classification = obj.classification;

        if (params.isAISystemEnabled && isWithinRange && !detected) {
          if (Math.random() < detectionChance) {
            detected = true;
            confidence = 0.7 + Math.random() * 0.3;
            classification = Math.random() < 0.95 ? obj.type : 'unknown';
            
            newMetrics.totalDetected += 1;
            newMetrics.detectionAccuracy = (newMetrics.totalDetected / newMetrics.totalSpawns) * 100;

            newLogs.unshift({ timestamp: Date.now(), message: `Object detected: ${classification} at ${obj.distance.toFixed(0)}m`, type: 'info' });
            newNarration = `[DETECTION] ${classification.toUpperCase()} identified at ${obj.distance.toFixed(0)}m. Confidence: ${(confidence * 100).toFixed(0)}%.`;
          }
        }

        // Update object movement
        const newDistance = obj.distance - (trainCurrentSpeed * deltaTime);
        const newLateralOffset = obj.lateralOffset + (Math.sin(obj.direction) * obj.speed * deltaTime);
        
        // Direction Intelligence
        const deltaLateralDist = Math.abs(obj.lateralOffset) - Math.abs(newLateralOffset);
        
        // State Tracking
        let newState = obj.state;
        const isOnTrack = Math.abs(newLateralOffset) < 1.5;
        const wasOnTrack = Math.abs(obj.lateralOffset) < 1.5;
        
        if (isOnTrack) {
          newState = 'ON_TRACK';
        } else if (wasOnTrack && !isOnTrack) {
          newState = 'MOVING_AWAY';
        } else if (newState === 'MOVING_AWAY' && Math.abs(newLateralOffset) > 5) {
          newState = 'CLEAR_OF_TRACK';
        } else if (deltaLateralDist < 0 && !isOnTrack && newState !== 'CLEAR_OF_TRACK') {
          newState = 'MOVING_AWAY';
        } else if (deltaLateralDist > 0 && !isOnTrack) {
          newState = 'APPROACHING_TRACK';
        }

        return {
          ...obj,
          distance: newDistance,
          previousDistance: obj.distance,
          lateralOffset: newLateralOffset,
          detected,
          confidence,
          classification,
          state: newState,
          previousState: obj.state,
        };
      });

      // State Change Narration
      updatedObjects.forEach(obj => {
        if (obj.detected && obj.state !== obj.previousState) {
          let stateMsg = '';
          if (obj.state === 'ON_TRACK') {
            stateMsg = `The ${obj.classification} is now on the track.`;
          } else if (obj.state === 'MOVING_AWAY') {
            stateMsg = `The ${obj.classification} is moving away from the track.`;
          } else if (obj.state === 'CLEAR_OF_TRACK') {
            stateMsg = `The ${obj.classification} has cleared the track.`;
          }
          
          if (stateMsg && !isBraking) {
            newNarration = stateMsg;
            ttsService.speak(stateMsg);
          }
        }
      });

      // Failure Mode: False Positive
      if (params.failureMode === 'false_positive' && Math.random() < 0.005 && updatedObjects.length < 5) {
        const ghost = spawnObject('cattle', 400 + Math.random() * 400);
        ghost.detected = true;
        ghost.confidence = 0.6 + Math.random() * 0.2;
        ghost.classification = 'cattle';
        updatedObjects.push(ghost);
        newLogs.unshift({ timestamp: Date.now(), message: 'WARNING: Ghost detection - Possible false positive', type: 'warning' });
        newNarration = `[WARNING] Anomalous signal detected. Possible false positive in sector.`;
      }

      // Continuous Spawning for CUSTOM2
      let finalObjects = updatedObjects;
      if (params.scenario === 'custom2' && params.custom2Config?.continuousIntrusion) {
        const timeSinceLastSpawn = (Date.now() - lastSpawnTimeRef.current) / 1000;
        const minInterval = params.custom2Config.spawnIntervalRange?.min || params.custom2Config.spawnInterval;
        const maxInterval = params.custom2Config.spawnIntervalRange?.max || params.custom2Config.spawnInterval;
        const dynamicInterval = minInterval + Math.random() * (maxInterval - minInterval);

        if (timeSinceLastSpawn > dynamicInterval && updatedObjects.length < params.custom2Config.maxObjects) {
          const types = params.custom2Config.allowedObjectTypes;
          const type = types[Math.floor(Math.random() * types.length)];
          
          const config = params.custom2Config.objectConfigs[type] || {
            entryPosition: 'left',
            movementDirection: 'towards',
            objectSpeed: 'medium',
            spawnTiming: 'normal'
          };

          // Use a higher distance for continuous spawn to avoid sudden appearance if not sudden
          const speed = getObjectSpeed(config.objectSpeed);
          const lat = config.entryPosition === 'left' ? -5 - Math.random() * 2 : config.entryPosition === 'right' ? 5 + Math.random() * 2 : (Math.random() - 0.5) * 1;
          const { dir, actualBehavior } = getObjectDirection(config.movementDirection, config.entryPosition);
          const actualSpeed = actualBehavior === 'stationary' ? 0 : speed;
          
          // Continuous spawn distance is usually far, but we can respect timing if it's 'sudden' or 'late'
          let spawnDist = 1000 + Math.random() * 200;
          if (config.spawnTiming === 'late') spawnDist = 400 + Math.random() * 100;
          if (config.spawnTiming === 'random') spawnDist = 400 + Math.random() * 800;

          const newObj = spawnObject(type, spawnDist, lat, dir, actualSpeed);
          finalObjects = [...updatedObjects, newObj];
          lastSpawnTimeRef.current = Date.now();
          newMetrics.totalSpawns += 1;
          newLogs.unshift({ timestamp: Date.now(), message: `New object spawned: ${type}`, type: 'info' });
        }
      }

      // Risk Assessment & Intelligent Braking
      let maxRiskScore = 0;
      let minTtc: number | null = null;
      let highestBrakingLevel: BrakingLevel = 'none';
      let stoppingDistance = 0;

      if (trainCurrentSpeed > 0) {
        // StoppingDistance = (Speed^2) / (2 * Deceleration)
        stoppingDistance = (Math.pow(trainCurrentSpeed, 2)) / (2 * params.brakingDeceleration);
      }

      const levelPriority: Record<BrakingLevel, number> = { 'none': 0, 'gradual': 1, 'emergency': 2 };

      for (const obj of finalObjects) {
        if (!obj.detected || obj.distance <= -10) continue;

        const speedMS = trainCurrentSpeed || 0.1;
        const objTtc = obj.distance / speedMS;
        
        const hasPassed = obj.distance < 0;
        const isOnTrack = obj.state === 'ON_TRACK';
        const isMovingAway = obj.state === 'MOVING_AWAY';
        const isClear = obj.state === 'CLEAR_OF_TRACK';

        // Predictive Collision Logic
        const futureObjectDist = obj.distance - (trainCurrentSpeed * TOTAL_REACTION_DELAY);
        const willCollideDuringDelay = futureObjectDist <= 0 && !hasPassed;

        let riskClass: 'low' | 'moderate' | 'high' = 'low';
        let currentBrakingLevel: BrakingLevel = 'none';

        if (isOnTrack && !hasPassed) {
          riskClass = 'high';
        } else if (hasPassed || isClear || isMovingAway) {
          riskClass = 'low';
        } else if (willCollideDuringDelay) {
          riskClass = 'high';
        } else if (obj.state === 'APPROACHING_TRACK') {
          if (objTtc < (TOTAL_REACTION_DELAY + SAFETY_BUFFER)) {
            riskClass = 'high';
          } else if (objTtc < 12) {
            riskClass = 'moderate';
          }
        }

        const isEnteringTrackZone = Math.abs(obj.lateralOffset) < 3.0;
        const isHighSpeed = trainCurrentSpeed > (60 / 3.6);
        if (isEnteringTrackZone && isHighSpeed && !hasPassed && !isMovingAway && !isClear) {
          riskClass = 'high';
        }

        let dirMultiplier = 0.5;
        if (isOnTrack) dirMultiplier = 1.5;
        else if (obj.state === 'APPROACHING_TRACK') dirMultiplier = 1.0;
        else if (isMovingAway || isClear || hasPassed) dirMultiplier = 0.1;

        const weight = 100;
        const objRiskScore = Math.min(100, (1 / Math.max(0.1, objTtc)) * dirMultiplier * weight);
        const finalObjRiskScore = riskClass === 'high' ? Math.max(objRiskScore, 90) : objRiskScore;

        if (finalObjRiskScore > maxRiskScore) {
          maxRiskScore = finalObjRiskScore;
        }
        if (!hasPassed && (minTtc === null || objTtc < minTtc)) {
          minTtc = objTtc;
        }

        if (params.isAISystemEnabled) {
          if (hasPassed || isClear || isMovingAway) {
            currentBrakingLevel = 'none';
          } else if (riskClass === 'high') {
            currentBrakingLevel = 'emergency';
          } else if (riskClass === 'moderate') {
            currentBrakingLevel = 'gradual';
          }
        }

        if (levelPriority[currentBrakingLevel] > levelPriority[highestBrakingLevel]) {
          highestBrakingLevel = currentBrakingLevel;
        }
      }

      if (params.isAISystemEnabled) {
        if (highestBrakingLevel === 'emergency' && prev.brakingLevel !== 'emergency') {
          newNarration = `Warning. High collision risk detected. Initiating emergency braking.`;
          newLogs.unshift({ timestamp: Date.now(), message: `CRITICAL: High risk detected`, type: 'error' });
          newMetrics.totalAlerts += 1;
          playAlertSound('emergency');
          ttsService.speak(newNarration);
        } else if (highestBrakingLevel === 'gradual' && prev.brakingLevel !== 'gradual') {
          newNarration = `I am observing potential hazards near the track. Applying gradual braking.`;
          newMetrics.totalAlerts += 1;
          playAlertSound('gradual');
          ttsService.speak(newNarration);
        } else if (highestBrakingLevel === 'none' && prev.brakingLevel !== 'none') {
          newNarration = `The track ahead is now clear. Restoring normal speed.`;
          newLogs.unshift({ timestamp: Date.now(), message: 'INFO: Hazard cleared', type: 'info' });
          ttsService.speak(newNarration);
        }
      }

      // Physics
      isBraking = highestBrakingLevel !== 'none';
      if (highestBrakingLevel === 'emergency') {
        trainCurrentSpeed = Math.max(0, trainCurrentSpeed - params.brakingDeceleration * deltaTime);
      } else if (highestBrakingLevel === 'gradual') {
        trainCurrentSpeed = Math.max(0, trainCurrentSpeed - (params.brakingDeceleration * 0.3) * deltaTime);
      } else if (!isBraking && trainCurrentSpeed < params.trainSpeed / 3.6) {
        trainCurrentSpeed = Math.min(params.trainSpeed / 3.6, trainCurrentSpeed + 1.0 * deltaTime);
      }
      trainPosition += trainCurrentSpeed * deltaTime;

      // Check Collision
      const collidingObj = finalObjects.find(obj => obj.distance <= 0 && Math.abs(obj.lateralOffset) < 1.5);
      if (collidingObj) {
        collisionOccurred = true;
        alerts = [...alerts, 'COLLISION DETECTED'];
        newMetrics.collisionsOccurred += 1;
        
        // Determine failure reason
        if (!collidingObj.detected) {
          failureReason = "Late detection or sensor failure.";
        } else if (collidingObj.distance > -10 && collidingObj.previousDistance > 0) {
          // It just hit, check stopping distance
          if (stoppingDistance > collidingObj.distance + 50) {
            failureReason = "Insufficient braking distance due to high speed.";
          } else {
            failureReason = "Object appeared too close for system response.";
          }
        } else {
          failureReason = "Collision occurred due to high train speed.";
        }

        newLogs.unshift({ timestamp: Date.now(), message: `FATAL: Collision occurred. Reason: ${failureReason}`, type: 'error' });
        newNarration = `[FATAL] Impact confirmed. ${failureReason}`;
        ttsService.speak(newNarration);
      } else if (trainCurrentSpeed === 0 && finalObjects.some(obj => obj.distance > 0 && obj.distance < 100 && Math.abs(obj.lateralOffset) < 1.5)) {
        collisionAvoided = true;
        alerts = [...alerts, 'COLLISION AVOIDED'];
        newMetrics.collisionsAvoided += 1;
        newLogs.unshift({ timestamp: Date.now(), message: 'SUCCESS: Collision avoided', type: 'info' });
        newNarration = `[SUCCESS] Hazard neutralized. Train halted at safe distance.`;
        ttsService.speak(newNarration);
      }

      return {
        ...prev,
        currentTime,
        trainCurrentSpeed,
        trainPosition,
        isBraking,
        brakingLevel: highestBrakingLevel,
        objects: finalObjects,
        riskScore: maxRiskScore,
        timeToCollision: minTtc,
        stoppingDistance,
        alerts,
        logs: newLogs.slice(0, 50),
        narration: newNarration,
        isSpeaking: ttsService.getSpeakingStatus(),
        collisionOccurred,
        collisionAvoided,
        metrics: newMetrics,
        failureReason
      };
    });

    requestRef.current = requestAnimationFrame(update);
  }, [params, startSimulation, spawnObject, stopSimulation, getObjectSpeed, getObjectDirection]);

  useEffect(() => {
    if (state.isRunning) {
      requestRef.current = requestAnimationFrame(update);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [state.isRunning, update]);

  return {
    state,
    startSimulation,
    stopSimulation,
    resetSimulation,
    runMonteCarlo,
  };
}
