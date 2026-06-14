/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Cloud, 
  CloudFog, 
  CloudRain, 
  Eye, 
  EyeOff, 
  Info, 
  Layers, 
  Map as MapIcon, 
  Moon, 
  Play, 
  RefreshCw, 
  Settings, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Sun, 
  Train, 
  Zap,
  BarChart3,
  FileText,
  ChevronRight,
  ChevronDown,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { cn } from './lib/utils';
import { useSimulation } from './hooks/useSimulation';
import { SimulationParams, Weather, TimeOfDay, Terrain, RiskLevel } from './types';

const INITIAL_PARAMS: SimulationParams = {
  trainSpeed: 80,
  brakingDeceleration: 1.2,
  reactionDelay: 1.5,
  weather: 'clear',
  timeOfDay: 'day',
  terrain: 'forest',
  sensorAccuracy: 0.95,
  aiConfidenceThreshold: 0.7,
  isAISystemEnabled: true,
  isMuted: false,
  failureMode: 'none',
  simulationSpeed: 1,
  scenario: 'wildlife',
  customConfig: {
    objectType: 'elephant',
    objectCount: 1,
    entryPosition: 'left',
    movementDirection: 'towards',
    objectSpeed: 'medium',
    spawnTiming: 'early',
  },
  custom2Config: {
    allowedObjectTypes: ['elephant', 'human', 'cattle'],
    objectConfigs: {
      elephant: { entryPosition: 'left', movementDirection: 'towards', objectSpeed: 'medium', spawnTiming: 'normal' },
      human: { entryPosition: 'right', movementDirection: 'crossing', objectSpeed: 'slow', spawnTiming: 'random' },
      cattle: { entryPosition: 'center', movementDirection: 'stationary', objectSpeed: 'medium', spawnTiming: 'late' },
    },
    continuousIntrusion: true,
    spawnInterval: 5,
    spawnIntervalRange: { min: 5, max: 15 },
    maxObjects: 10,
    trackType: 'straight',
  }
};

export default function App() {
  const [params, setParams] = useState<SimulationParams>(INITIAL_PARAMS);
  const { state, startSimulation, stopSimulation, resetSimulation, runMonteCarlo } = useSimulation(params);
  const [view, setView] = useState<'simulation' | 'analytics' | 'comparison'>('simulation');
  const [monteCarloResults, setMonteCarloResults] = useState<any[]>([]);
  const [scenarioMode, setScenarioMode] = useState<'presets' | 'custom' | 'custom2'>('presets');
  const [expandedObjectConfig, setExpandedObjectConfig] = useState<string | null>(null);

  const runAnalysis = () => {
    const results = runMonteCarlo(50);
    setMonteCarloResults(results);
  };

  const analyticsData = useMemo(() => {
    if (monteCarloResults.length === 0) return null;
    const successCount = monteCarloResults.filter(r => r.success).length;
    return {
      successRate: (successCount / monteCarloResults.length) * 100,
      avgReactionTime: monteCarloResults.reduce((acc, r) => acc + r.reactionTime, 0) / monteCarloResults.length,
      avgStoppingDistance: monteCarloResults.reduce((acc, r) => acc + r.stoppingDistance, 0) / monteCarloResults.length,
    };
  }, [monteCarloResults]);

  const riskColor = useMemo(() => {
    if (state.riskScore > 80) return 'text-red-500';
    if (state.riskScore > 40) return 'text-yellow-500';
    return 'text-green-500';
  }, [state.riskScore]);

  const riskBg = useMemo(() => {
    if (state.riskScore > 80) return 'bg-red-500/10 border-red-500/50';
    if (state.riskScore > 40) return 'bg-yellow-500/10 border-yellow-500/50';
    return 'bg-green-500/10 border-green-500/50';
  }, [state.riskScore]);

  return (
    <div className="min-h-screen bg-[#050506] text-zinc-300 font-sans selection:bg-orange-500/30 overflow-hidden flex flex-col">
      {/* Top Navigation / Status Bar */}
      <header className="h-14 border-b border-zinc-800/50 flex items-center justify-between px-6 bg-[#0a0a0b] shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center shadow-lg shadow-orange-600/20">
              <Shield className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tighter text-white uppercase leading-none">TrackSafe AI</h1>
              <p className="text-[8px] text-zinc-500 font-mono uppercase tracking-[0.2em] mt-1">v2.4.0-PRO-SIM</p>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800 mx-2" />
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest">System Status</span>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", state.isRunning ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-zinc-700")} />
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-tight">{state.isRunning ? 'Operational' : 'Standby'}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest">Edge AI Confidence</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 transition-all duration-500" 
                    style={{ width: `${params.sensorAccuracy * 100}%` }} 
                  />
                </div>
                <span className="text-[10px] font-mono text-zinc-400">{(params.sensorAccuracy * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-zinc-900/30 p-1 rounded-lg border border-zinc-800/50">
          {[
            { id: 'simulation', label: 'Monitor', icon: Activity },
            { id: 'analytics', label: 'Analysis', icon: BarChart3 },
            { id: 'comparison', label: 'Safety Delta', icon: History },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                view === item.id 
                  ? "bg-zinc-800 text-orange-500 border border-zinc-700 shadow-inner" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
              )}
            >
              <item.icon className="w-3 h-3" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest">Current Time (UTC)</p>
            <p className="text-[10px] font-mono text-zinc-400">2026-03-29 10:03:53</p>
          </div>
          <button 
            onClick={() => setParams(p => ({ ...p, isMuted: !p.isMuted }))}
            className={cn(
              "p-2 transition-colors border rounded hover:bg-zinc-800/50",
              params.isMuted ? "text-red-500 border-red-500/30" : "text-zinc-500 border-zinc-800"
            )}
          >
            {params.isMuted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button className="p-2 text-zinc-500 hover:text-white transition-colors border border-zinc-800 rounded hover:bg-zinc-800/50">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Scenario & Controls */}
        <aside className="w-80 border-r border-zinc-800/50 bg-[#0a0a0b] flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-800/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Scenario Engine</h2>
              <div className="flex gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800">
                <button 
                  onClick={() => setScenarioMode('presets')}
                  className={cn("px-2 py-1 rounded text-[9px] font-bold transition-all uppercase", scenarioMode === 'presets' ? "bg-zinc-800 text-orange-500" : "text-zinc-600")}
                >
                  Presets
                </button>
                <button 
                  onClick={() => setScenarioMode('custom')}
                  className={cn("px-2 py-1 rounded text-[9px] font-bold transition-all uppercase", scenarioMode === 'custom' ? "bg-zinc-800 text-orange-500" : "text-zinc-600")}
                >
                  Custom
                </button>
                <button 
                  onClick={() => setScenarioMode('custom2')}
                  className={cn("px-2 py-1 rounded text-[9px] font-bold transition-all uppercase", scenarioMode === 'custom2' ? "bg-zinc-800 text-orange-500" : "text-zinc-600")}
                >
                  Custom2
                </button>
              </div>
            </div>

            {scenarioMode === 'presets' && (
              <div className="space-y-2">
                {[
                  { id: 'wildlife', label: 'Wildlife Crossing', icon: '🐘', desc: 'Elephant intrusion' },
                  { id: 'human', label: 'Human Intrusion', icon: '👤', desc: 'Unauthorized personnel' },
                  { id: 'sudden_obstacle', label: 'Sudden Obstacle', icon: '⚡', desc: 'Critical response' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setParams(p => ({ ...p, scenario: s.id as any }));
                      startSimulation(s.id as any);
                    }}
                    className={cn(
                      "w-full p-3 rounded border text-left flex items-center gap-3 group transition-all",
                      params.scenario === s.id 
                        ? "border-orange-500/50 bg-orange-500/5" 
                        : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
                    )}
                  >
                    <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{s.icon}</span>
                    <div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-tight", params.scenario === s.id ? "text-orange-500" : "text-zinc-300")}>{s.label}</p>
                      <p className="text-[8px] text-zinc-600 uppercase font-mono">{s.desc}</p>
                    </div>
                    {params.scenario === s.id && <ChevronRight className="w-3 h-3 ml-auto text-orange-500" />}
                  </button>
                ))}
              </div>
            )}

            {scenarioMode === 'custom' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] uppercase font-bold text-zinc-600 tracking-widest">Object Type</label>
                  <select 
                    value={params.customConfig?.objectType}
                    onChange={(e) => setParams(p => ({ ...p, scenario: 'custom', customConfig: { ...p.customConfig!, objectType: e.target.value as any } }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                  >
                    <option value="elephant">ELEPHANT_UNIT</option>
                    <option value="human">HUMAN_UNIT</option>
                    <option value="cattle">CATTLE_UNIT</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-zinc-600">
                    <span>Unit Count</span>
                    <span className="text-orange-500">{params.customConfig?.objectCount}</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" 
                    value={params.customConfig?.objectCount}
                    onChange={(e) => setParams(p => ({ ...p, scenario: 'custom', customConfig: { ...p.customConfig!, objectCount: parseInt(e.target.value) } }))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[8px] uppercase font-bold text-zinc-600 tracking-widest">Entry</label>
                    <select 
                      value={params.customConfig?.entryPosition}
                      onChange={(e) => setParams(p => ({ ...p, scenario: 'custom', customConfig: { ...p.customConfig!, entryPosition: e.target.value as any } }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                    >
                      <option value="left">LEFT</option>
                      <option value="right">RIGHT</option>
                      <option value="center">CENTER</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] uppercase font-bold text-zinc-600 tracking-widest">Behavior</label>
                    <select 
                      value={params.customConfig?.movementDirection}
                      onChange={(e) => setParams(p => ({ ...p, scenario: 'custom', customConfig: { ...p.customConfig!, movementDirection: e.target.value as any } }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                    >
                      <option value="towards">TOWARDS_TRACK</option>
                      <option value="away">MOVING_AWAY</option>
                      <option value="crossing">CROSSING_TRACK</option>
                      <option value="stationary">STATIONARY</option>
                      <option value="hybrid">HYBRID_ERRATIC</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[8px] uppercase font-bold text-zinc-600 tracking-widest">Speed</label>
                    <select 
                      value={params.customConfig?.objectSpeed}
                      onChange={(e) => setParams(p => ({ ...p, scenario: 'custom', customConfig: { ...p.customConfig!, objectSpeed: e.target.value as any } }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                    >
                      <option value="slow">SLOW (1-2 m/s)</option>
                      <option value="medium">MEDIUM (3-4 m/s)</option>
                      <option value="fast">FAST (6+ m/s)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] uppercase font-bold text-zinc-600 tracking-widest">Timing</label>
                    <select 
                      value={params.customConfig?.spawnTiming}
                      onChange={(e) => setParams(p => ({ ...p, scenario: 'custom', customConfig: { ...p.customConfig!, spawnTiming: e.target.value as any } }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                    >
                      <option value="early">EARLY_WARNING</option>
                      <option value="delayed">STANDARD_RANGE</option>
                      <option value="sudden">SUDDEN_APPEARANCE</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setParams(p => ({ ...p, scenario: 'custom' }));
                    startSimulation('custom');
                  }}
                  className="w-full h-10 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-600/20"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  Initialize Custom
                </button>
              </div>
            )}

            {scenarioMode === 'custom2' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] uppercase font-bold text-zinc-600 tracking-widest">Allowed Units</label>
                  <div className="grid grid-cols-1 gap-1">
                    {['elephant', 'human', 'cattle'].map(type => (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded border border-zinc-800 hover:bg-zinc-900 transition-colors">
                          <input 
                            type="checkbox"
                            checked={params.custom2Config?.allowedObjectTypes.includes(type as any)}
                            onChange={(e) => {
                              const current = params.custom2Config?.allowedObjectTypes || [];
                              const updated = e.target.checked 
                                ? [...current, type as any]
                                : current.filter(t => t !== type);
                              setParams(p => ({ ...p, custom2Config: { ...p.custom2Config!, allowedObjectTypes: updated } }));
                            }}
                            className="w-3 h-3 accent-orange-600"
                          />
                          <span className="text-[10px] font-mono uppercase text-zinc-400 flex-1">{type}_UNIT</span>
                          {params.custom2Config?.allowedObjectTypes.includes(type as any) && (
                            <button 
                              onClick={() => setExpandedObjectConfig(expandedObjectConfig === type ? null : type)}
                              className="p-1 hover:bg-zinc-800 rounded transition-colors"
                            >
                              {expandedObjectConfig === type ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronRight className="w-3 h-3 text-zinc-500" />}
                            </button>
                          )}
                        </div>

                        {/* Per-Object Configuration Card */}
                        <AnimatePresence>
                          {expandedObjectConfig === type && params.custom2Config?.allowedObjectTypes.includes(type as any) && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-zinc-900/50 border-x border-b border-zinc-800 rounded-b p-3 space-y-3"
                            >
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[7px] uppercase font-bold text-zinc-500 tracking-widest">Entry</label>
                                  <select 
                                    value={params.custom2Config?.objectConfigs[type as any]?.entryPosition}
                                    onChange={(e) => {
                                      const config = params.custom2Config!.objectConfigs[type as any]!;
                                      setParams(p => ({
                                        ...p,
                                        custom2Config: {
                                          ...p.custom2Config!,
                                          objectConfigs: {
                                            ...p.custom2Config!.objectConfigs,
                                            [type]: { ...config, entryPosition: e.target.value as any }
                                          }
                                        }
                                      }));
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-[9px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                                  >
                                    <option value="left">LEFT</option>
                                    <option value="right">RIGHT</option>
                                    <option value="center">CENTER</option>
                                    <option value="random">RANDOM</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[7px] uppercase font-bold text-zinc-500 tracking-widest">Behavior</label>
                                  <select 
                                    value={params.custom2Config?.objectConfigs[type as any]?.movementDirection}
                                    onChange={(e) => {
                                      const config = params.custom2Config!.objectConfigs[type as any]!;
                                      setParams(p => ({
                                        ...p,
                                        custom2Config: {
                                          ...p.custom2Config!,
                                          objectConfigs: {
                                            ...p.custom2Config!.objectConfigs,
                                            [type]: { ...config, movementDirection: e.target.value as any }
                                          }
                                        }
                                      }));
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-[9px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                                  >
                                    <option value="towards">TOWARDS</option>
                                    <option value="away">AWAY</option>
                                    <option value="crossing">CROSSING</option>
                                    <option value="stationary">STATIONARY</option>
                                    <option value="hybrid">HYBRID</option>
                                    <option value="random">RANDOM</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[7px] uppercase font-bold text-zinc-500 tracking-widest">Speed</label>
                                  <select 
                                    value={params.custom2Config?.objectConfigs[type as any]?.objectSpeed}
                                    onChange={(e) => {
                                      const config = params.custom2Config!.objectConfigs[type as any]!;
                                      setParams(p => ({
                                        ...p,
                                        custom2Config: {
                                          ...p.custom2Config!,
                                          objectConfigs: {
                                            ...p.custom2Config!.objectConfigs,
                                            [type]: { ...config, objectSpeed: e.target.value as any }
                                          }
                                        }
                                      }));
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-[9px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                                  >
                                    <option value="slow">SLOW</option>
                                    <option value="medium">MEDIUM</option>
                                    <option value="fast">FAST</option>
                                    <option value="random">RANDOM</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[7px] uppercase font-bold text-zinc-500 tracking-widest">Timing</label>
                                  <select 
                                    value={params.custom2Config?.objectConfigs[type as any]?.spawnTiming}
                                    onChange={(e) => {
                                      const config = params.custom2Config!.objectConfigs[type as any]!;
                                      setParams(p => ({
                                        ...p,
                                        custom2Config: {
                                          ...p.custom2Config!,
                                          objectConfigs: {
                                            ...p.custom2Config!.objectConfigs,
                                            [type]: { ...config, spawnTiming: e.target.value as any }
                                          }
                                        }
                                      }));
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-[9px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                                  >
                                    <option value="early">EARLY</option>
                                    <option value="normal">NORMAL</option>
                                    <option value="late">LATE</option>
                                    <option value="random">RANDOM</option>
                                  </select>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-zinc-600">
                    <span>Spawn Interval Range (sec)</span>
                    <span className="text-orange-500">{params.custom2Config?.spawnIntervalRange.min}s - {params.custom2Config?.spawnIntervalRange.max}s</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="range" min="1" max="10" 
                      value={params.custom2Config?.spawnIntervalRange.min}
                      onChange={(e) => setParams(p => ({ ...p, custom2Config: { ...p.custom2Config!, spawnIntervalRange: { ...p.custom2Config!.spawnIntervalRange, min: parseInt(e.target.value) } } }))}
                      className="w-1/2 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                    <input 
                      type="range" min="11" max="30" 
                      value={params.custom2Config?.spawnIntervalRange.max}
                      onChange={(e) => setParams(p => ({ ...p, custom2Config: { ...p.custom2Config!, spawnIntervalRange: { ...p.custom2Config!.spawnIntervalRange, max: parseInt(e.target.value) } } }))}
                      className="w-1/2 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] uppercase font-bold text-zinc-600 tracking-widest">Track Geometry</label>
                  <select 
                    value={params.custom2Config?.trackType}
                    onChange={(e) => setParams(p => ({ ...p, custom2Config: { ...p.custom2Config!, trackType: e.target.value as any } }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                  >
                    <option value="straight">STRAIGHT_LINE</option>
                    <option value="mild_curve">MILD_CURVE</option>
                    <option value="sharp_curve">SHARP_CURVE</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-zinc-600">
                    <span>Max Concurrent Units</span>
                    <span className="text-orange-500">{params.custom2Config?.maxObjects}</span>
                  </div>
                  <input 
                    type="range" min="1" max="20" 
                    value={params.custom2Config?.maxObjects}
                    onChange={(e) => setParams(p => ({ ...p, custom2Config: { ...p.custom2Config!, maxObjects: parseInt(e.target.value) } }))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-zinc-800">
                  <span className="text-[8px] uppercase font-bold text-zinc-600 tracking-widest">Continuous Intrusion</span>
                  <button 
                    onClick={() => setParams(p => ({ ...p, custom2Config: { ...p.custom2Config!, continuousIntrusion: !p.custom2Config?.continuousIntrusion } }))}
                    className={cn(
                      "w-8 h-4 rounded-full transition-all relative",
                      params.custom2Config?.continuousIntrusion ? "bg-orange-600" : "bg-zinc-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                      params.custom2Config?.continuousIntrusion ? "right-0.5" : "left-0.5"
                    )} />
                  </button>
                </div>

                <button 
                  onClick={() => {
                    setParams(p => ({ ...p, scenario: 'custom2' }));
                    startSimulation('custom2');
                  }}
                  className="w-full h-10 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-600/20"
                >
                  <Layers className="w-3 h-3" />
                  Initialize Advanced
                </button>

                {params.scenario === 'custom2' && state.isRunning && (
                  <div className="mt-4 p-3 bg-zinc-950 rounded border border-zinc-800 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-500">
                      <Zap className="w-3 h-3" />
                      Live Metrics Dashboard
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                        <div className="text-[7px] text-zinc-500 uppercase font-bold">Detected</div>
                        <div className="text-lg font-mono font-bold text-white">{state.metrics.totalDetected}</div>
                      </div>
                      <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                        <div className="text-[7px] text-zinc-500 uppercase font-bold">Alerts</div>
                        <div className="text-lg font-mono font-bold text-orange-500">{state.metrics.totalAlerts}</div>
                      </div>
                      <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                        <div className="text-[7px] text-zinc-500 uppercase font-bold">Avoided</div>
                        <div className="text-lg font-mono font-bold text-green-500">{state.metrics.collisionsAvoided}</div>
                      </div>
                      <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                        <div className="text-[7px] text-zinc-500 uppercase font-bold">Collisions</div>
                        <div className="text-lg font-mono font-bold text-red-500">{state.metrics.collisionsOccurred}</div>
                      </div>
                    </div>
                    <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-[7px] text-zinc-500 uppercase font-bold">Detection Accuracy</div>
                        <div className="text-[10px] font-mono font-bold text-white">{state.metrics.detectionAccuracy.toFixed(1)}%</div>
                      </div>
                      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 transition-all duration-500" 
                          style={{ width: `${state.metrics.detectionAccuracy}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Environmental Parameters</h2>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-zinc-600">
                  <span>Target Train Speed</span>
                  <span className="text-orange-500">{params.trainSpeed} KM/H</span>
                </div>
                <input 
                  type="range" min="0" max="160" 
                  value={params.trainSpeed}
                  onChange={(e) => setParams(p => ({ ...p, trainSpeed: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[8px] uppercase font-bold text-zinc-600 tracking-widest">Weather</label>
                  <select 
                    value={params.weather}
                    onChange={(e) => setParams(p => ({ ...p, weather: e.target.value as any }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                  >
                    <option value="clear">CLEAR</option>
                    <option value="fog">FOG_DENSE</option>
                    <option value="rain">RAIN_HEAVY</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] uppercase font-bold text-zinc-600 tracking-widest">Time Cycle</label>
                  <select 
                    value={params.timeOfDay}
                    onChange={(e) => setParams(p => ({ ...p, timeOfDay: e.target.value as any }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] text-zinc-300 focus:outline-none focus:border-orange-500 font-mono"
                  >
                    <option value="day">DAY_LIGHT</option>
                    <option value="night">NIGHT_IR</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] uppercase font-bold text-zinc-600 tracking-widest">System Failure Simulation</label>
                <select 
                  value={params.failureMode}
                  onChange={(e) => setParams(p => ({ ...p, failureMode: e.target.value as any }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] text-red-500/80 focus:outline-none focus:border-red-500 font-mono"
                >
                  <option value="none">NO_FAILURE (OPTIMAL)</option>
                  <option value="sensor_failure">SENSOR_DEGRADATION</option>
                  <option value="false_positive">FALSE_POSITIVE_GHOST</option>
                  <option value="missed_detection">DETECTION_FAILURE</option>
                  <option value="delayed_detection">LATENCY_INJECTION</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800/50 bg-zinc-950/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-[1px] bg-zinc-800" />
              <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Playback</span>
              <div className="flex-1 h-[1px] bg-zinc-800" />
            </div>
            <div className="flex gap-2">
              {!state.isRunning ? (
                <button 
                  onClick={() => startSimulation()}
                  className="flex-1 h-10 bg-zinc-100 hover:bg-white text-zinc-950 rounded font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Start
                </button>
              ) : (
                <button 
                  onClick={stopSimulation}
                  className="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <RefreshCw className="w-3 h-3" />
                  Pause
                </button>
              )}
              <button 
                onClick={resetSimulation}
                className="w-10 h-10 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded flex items-center justify-center text-zinc-500 transition-all active:scale-95"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            <div className="mt-3 flex gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800">
              {([1, 2, 5] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setParams(p => ({ ...p, simulationSpeed: s }))}
                  className={cn(
                    "flex-1 py-1 rounded text-[8px] font-bold transition-all uppercase",
                    params.simulationSpeed === s ? "bg-zinc-800 text-orange-500" : "text-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {s}x Speed
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center: Main Display */}
        <div className="flex-1 flex flex-col bg-[#050506] overflow-hidden">
          {/* AI Narration Feed */}
          <div className={cn(
            "h-16 border-b border-zinc-800/50 bg-[#0a0a0b]/50 backdrop-blur-sm flex items-center px-6 gap-4 shrink-0 transition-all duration-300",
            state.isSpeaking && "border-orange-500/50 bg-orange-500/5 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all",
              state.isSpeaking ? "border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" : "border-orange-500/30"
            )}>
              <Activity className={cn("w-4 h-4 text-orange-500", state.isSpeaking ? "animate-bounce" : "animate-pulse")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[8px] font-bold text-orange-500 uppercase tracking-widest">AI_NARRATIVE_STREAM</span>
                <div className={cn("h-[1px] flex-1 transition-all", state.isSpeaking ? "bg-orange-500" : "bg-orange-500/10")} />
              </div>
              <p className={cn(
                "text-[11px] font-medium italic truncate transition-all",
                state.isSpeaking ? "text-white scale-[1.02] origin-left" : "text-zinc-300"
              )}>
                {state.narration || "AWAITING_SCENARIO_INITIALIZATION..."}
              </p>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden p-6">
            <AnimatePresence mode="wait">
              {view === 'simulation' && (
                <motion.div 
                  key="sim"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="h-full flex flex-col gap-6"
                >
                  <div className="flex-1 relative bg-black rounded-xl border border-zinc-800 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] group">
                    <TrackSimulation state={state} params={params} />
                    
                    {/* Technical Overlays */}
                    <div className="absolute inset-0 pointer-events-none border-[20px] border-transparent group-hover:border-zinc-900/10 transition-all duration-700" />
                    
                    {/* Corner Brackets */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-zinc-700" />
                    <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-zinc-700" />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-zinc-700" />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-zinc-700" />

                    {/* Simulation HUD */}
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                      <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-white/5 flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full bg-orange-500", state.isRunning && "animate-pulse")} />
                        <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-tight">Real-time Detection Active</span>
                      </div>
                      {state.brakingLevel !== 'none' && (
                        <div className={cn(
                          "bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border flex items-center gap-2 animate-pulse",
                          state.brakingLevel === 'emergency' ? "border-red-500/50 text-red-500" : "border-yellow-500/50 text-yellow-500"
                        )}>
                          <ShieldAlert className="w-3 h-3" />
                          <span className="text-[9px] font-bold uppercase tracking-tight">
                            {state.brakingLevel === 'emergency' ? 'EMERGENCY BRAKING' : 'GRADUAL DECELERATION'}
                          </span>
                        </div>
                      )}
                      {params.failureMode !== 'none' && (
                        <div className="bg-red-600/20 backdrop-blur-md px-3 py-1.5 rounded border border-red-500/50 flex items-center gap-2 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span className="text-[9px] font-bold text-red-400 uppercase tracking-tight">System Degraded: {params.failureMode.replace('_', ' ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Collision/Avoidance Overlay */}
                    <AnimatePresence>
                      {state.collisionOccurred && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center z-50 bg-red-950/40 backdrop-blur-sm"
                        >
                          <div className="bg-zinc-950 border-2 border-red-600 p-8 rounded-2xl shadow-[0_0_100px_rgba(220,38,38,0.4)] text-center max-w-md">
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                              <AlertTriangle className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Impact Confirmed</h2>
                            <p className="text-red-400 font-mono text-xs uppercase tracking-widest mb-6">Simulation Failure Mode</p>
                            <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-lg mb-8">
                              <p className="text-sm font-medium text-red-200">
                                {state.failureReason || "System failed to mitigate collision."}
                              </p>
                            </div>
                            <button 
                              onClick={resetSimulation}
                              className="w-full h-12 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
                            >
                              Restart Simulation
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {state.collisionAvoided && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center z-50 bg-green-950/40 backdrop-blur-sm"
                        >
                          <div className="bg-zinc-950 border-2 border-green-600 p-8 rounded-2xl shadow-[0_0_100px_rgba(22,163,74,0.4)] text-center max-w-md">
                            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                              <ShieldCheck className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Hazard Neutralized</h2>
                            <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-6">Safety Protocol Success</p>
                            <div className="bg-green-600/10 border border-green-600/20 p-4 rounded-lg mb-8">
                              <p className="text-sm font-medium text-green-200">
                                The train was halted at a safe distance from the obstacle.
                              </p>
                            </div>
                            <button 
                              onClick={resetSimulation}
                              className="w-full h-12 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg shadow-green-600/20"
                            >
                              Continue Testing
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Subtitles Overlay */}
                    {state.isSpeaking && (
                      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 pointer-events-none">
                        <div className="bg-black/80 backdrop-blur-md border border-orange-500/30 p-3 rounded-lg text-center shadow-2xl">
                          <p className="text-xs font-medium text-white leading-relaxed">
                            {state.narration}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-6 right-6 flex flex-col items-end gap-1">
                      <span className="text-[8px] font-mono text-zinc-600 uppercase">Telemetry Feed</span>
                      <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded border border-white/5 font-mono text-[10px] text-zinc-400 space-y-1">
                        <div className="flex justify-between gap-8">
                          <span className="text-zinc-600">POS_X:</span>
                          <span>{state.trainPosition.toFixed(2)}m</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span className="text-zinc-600">VEL_V:</span>
                          <span>{(state.trainCurrentSpeed * 3.6).toFixed(1)}km/h</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span className="text-zinc-600">T_ELAPSED:</span>
                          <span>{state.currentTime.toFixed(2)}s</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Metrics Bar */}
                  <div className="grid grid-cols-5 gap-4 shrink-0">
                    {[
                      { 
                        label: 'Train Velocity', 
                        value: (state.trainCurrentSpeed * 3.6).toFixed(1), 
                        unit: 'km/h', 
                        icon: Train,
                        status: state.brakingLevel !== 'none' ? (state.brakingLevel === 'emergency' ? 'EMERGENCY' : 'GRADUAL') : null,
                        statusColor: state.brakingLevel === 'emergency' ? 'text-red-500' : 'text-yellow-500'
                      },
                      { label: 'Track Position', value: state.trainPosition.toFixed(0), unit: 'm', icon: MapIcon },
                      { label: 'Stopping Distance', value: state.stoppingDistance.toFixed(1), unit: 'm', icon: ShieldCheck, color: 'text-blue-400' },
                      { label: 'Time to Collision', value: state.timeToCollision?.toFixed(1) || '--', unit: 's', icon: Zap, color: 'text-orange-500' },
                      { label: 'Risk Gradient', value: state.riskScore.toFixed(0), unit: '%', icon: AlertTriangle, color: riskColor },
                    ].map((m, i) => (
                      <div key={i} className={cn(
                        "bg-zinc-900/30 border p-4 rounded-xl flex items-center gap-4 relative overflow-hidden transition-all duration-500",
                        m.status ? (m.status === 'EMERGENCY' ? "border-red-500/50 bg-red-500/5" : "border-yellow-500/50 bg-yellow-500/5") : "border-zinc-800/50"
                      )}>
                        <div className={cn(
                          "w-10 h-10 rounded-lg bg-zinc-950 border flex items-center justify-center shrink-0 transition-colors",
                          m.status ? (m.status === 'EMERGENCY' ? "border-red-500/50" : "border-yellow-500/50") : "border-zinc-800"
                        )}>
                          <m.icon className={cn("w-5 h-5", m.color || "text-zinc-500")} />
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">{m.label}</p>
                          <p className={cn("text-xl font-black font-mono leading-none", m.color || "text-white")}>
                            {m.value} <span className="text-[10px] text-zinc-600 font-normal">{m.unit}</span>
                          </p>
                          {m.status && (
                            <p className={cn("text-[7px] font-bold uppercase mt-1", m.statusColor)}>
                              {m.status} BRAKING
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {view === 'analytics' && (
                <motion.div 
                  key="analytics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full flex flex-col gap-6"
                >
                  <div className="grid grid-cols-3 gap-6 shrink-0">
                    <div className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-2xl">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Monte Carlo Success Rate</h3>
                      <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-white font-mono">{analyticsData?.successRate.toFixed(1) || '0.0'}%</span>
                        <div className="mb-2 w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${analyticsData?.successRate || 0}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-2xl">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Avg Reaction Time</h3>
                      <p className="text-4xl font-black text-white font-mono">{analyticsData?.avgReactionTime.toFixed(2) || '0.00'}s</p>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-2xl flex flex-col justify-between">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Run Batch Simulation</h3>
                      <button 
                        onClick={runAnalysis}
                        className="w-full h-10 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold text-[10px] uppercase tracking-widest transition-all"
                      >
                        Execute 50 Iterations
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 flex flex-col">
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Stopping Distance Distribution (m)</h3>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monteCarloResults}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                          <XAxis dataKey="id" hide />
                          <YAxis stroke="#4b5563" fontSize={10} fontClassName="font-mono" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid #27272a', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
                          />
                          <Bar dataKey="stoppingDistance">
                            {monteCarloResults.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.success ? '#22c55e' : '#ef4444'} fillOpacity={0.6} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Sidebar: Logs & Alerts */}
        <aside className="w-80 border-l border-zinc-800/50 bg-[#0a0a0b] flex flex-col shrink-0">
          {/* Alerts Section */}
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">System Alerts</h2>
            <div className="space-y-2">
              <AnimatePresence>
                {state.alerts.length === 0 ? (
                  <p className="text-[9px] text-zinc-700 font-mono uppercase tracking-widest text-center py-4">No active alerts</p>
                ) : (
                  state.alerts.map((alert, i) => (
                    <motion.div
                      key={alert + i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        "p-3 rounded border flex items-center gap-3",
                        alert.includes('COLLISION') ? "bg-red-500/10 border-red-500/50 text-red-500" : "bg-orange-500/10 border-orange-500/50 text-orange-500"
                      )}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{alert}</span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Logs Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Event Log</h2>
              <span className="text-[8px] font-mono text-zinc-700">{state.logs.length} ENTRIES</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {state.logs.map((log, i) => (
                <div key={i} className="group">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn(
                      "w-1 h-3 rounded-full",
                      log.type === 'error' ? "bg-red-500" : log.type === 'warning' ? "bg-orange-500" : "bg-zinc-700"
                    )} />
                    <span className="text-[8px] font-mono text-zinc-600">
                      [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}]
                    </span>
                    <span className={cn(
                      "text-[8px] font-bold uppercase tracking-widest",
                      log.type === 'error' ? "text-red-500" : log.type === 'warning' ? "text-orange-500" : "text-zinc-500"
                    )}>
                      {log.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono leading-relaxed pl-3 border-l border-zinc-800 group-hover:border-zinc-700 transition-colors">
                    {log.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* System Info Footer */}
          <div className="p-4 bg-zinc-950/50 border-t border-zinc-800/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest">Sensor Array</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[9px] font-mono text-zinc-400">ONLINE</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest">Edge AI</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[9px] font-mono text-zinc-400">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function TrackSimulation({ state, params }: { state: any, params: SimulationParams }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Draw Environment
      const isNight = params.timeOfDay === 'night';
      ctx.fillStyle = isNight ? '#050505' : '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      // Draw Track
      const trackType = params.custom2Config?.trackType || 'straight';
      const curveOffset = trackType === 'mild_curve' ? 50 : trackType === 'sharp_curve' ? 120 : 0;
      
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 40;
      ctx.beginPath();
      if (trackType === 'straight') {
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
      } else {
        ctx.moveTo(width / 2, height);
        ctx.bezierCurveTo(width / 2, height / 2, width / 2 + curveOffset, height / 2, width / 2 + curveOffset, 0);
      }
      ctx.stroke();

      // Highlight Railway Track Zone (Safety Zone)
      ctx.fillStyle = 'rgba(249, 115, 22, 0.05)';
      if (trackType === 'straight') {
        ctx.fillRect(width / 2 - 25, 0, 50, height);
      }

      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (trackType === 'straight') {
        ctx.moveTo(width / 2 - 15, 0);
        ctx.lineTo(width / 2 - 15, height);
        ctx.moveTo(width / 2 + 15, 0);
        ctx.lineTo(width / 2 + 15, height);
      } else {
        // Simple curve rails
        ctx.moveTo(width / 2 - 15, height);
        ctx.bezierCurveTo(width / 2 - 15, height / 2, width / 2 + curveOffset - 15, height / 2, width / 2 + curveOffset - 15, 0);
        ctx.moveTo(width / 2 + 15, height);
        ctx.bezierCurveTo(width / 2 + 15, height / 2, width / 2 + curveOffset + 15, height / 2, width / 2 + curveOffset + 15, 0);
      }
      ctx.stroke();

      // Risk Zones (Visual Indicators)
      if (params.scenario === 'custom2') {
        // High Risk Zone (Red)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fillRect(width / 2 - 20, height - 150, 40, 100);
        
        // Moderate Risk Zone (Yellow)
        ctx.fillStyle = 'rgba(234, 179, 8, 0.05)';
        ctx.fillRect(width / 2 - 30, height - 300, 60, 150);
        
        // Safe Zone (Green)
        ctx.fillStyle = 'rgba(34, 197, 94, 0.02)';
        ctx.fillRect(0, 0, width, height - 300);
      }

      // Draw Sleepers
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 4;
      const sleeperSpacing = 20;
      const sleeperOffset = (state.trainPosition % sleeperSpacing);
      for (let i = -sleeperSpacing; i < height + sleeperSpacing; i += sleeperSpacing) {
        const y = i + sleeperOffset;
        if (trackType === 'straight') {
          ctx.beginPath();
          ctx.moveTo(width / 2 - 25, y);
          ctx.lineTo(width / 2 + 25, y);
          ctx.stroke();
        }
      }

      // Draw Objects
      state.objects.forEach((obj: any) => {
        const y = height - (obj.distance * 0.5); // Scale distance for visualization
        if (y < -50 || y > height + 50) return;

        let x = width / 2 + (obj.lateralOffset * 10);
        
        // Adjust X for curves
        if (trackType !== 'straight') {
          const t = 1 - (y / height); // 0 at bottom, 1 at top
          // Simple quadratic bezier approximation for X offset
          const curveX = curveOffset * (t * t); 
          x += curveX;
        }

        // Tracked Movement Path (Trajectory Lines)
        if (obj.detected && params.isAISystemEnabled) {
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(x, y);
          // Predict future position based on current speed and direction
          const predictY = y - (obj.speed * 20); 
          const predictX = x + (Math.sin(obj.direction) * obj.speed * 20);
          ctx.lineTo(predictX, predictY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Detection Box
        if (obj.detected && params.isAISystemEnabled) {
          const isCritical = obj.distance < 200;
          ctx.strokeStyle = isCritical ? '#ef4444' : '#f97316';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          ctx.strokeRect(x - 20, y - 20, 40, 40);
          ctx.setLineDash([]);
          
          // Label
          ctx.fillStyle = isCritical ? '#ef4444' : '#f97316';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`${obj.classification.toUpperCase()}`, x - 20, y - 25);
          ctx.font = '8px monospace';
          ctx.fillText(`${(obj.confidence * 100).toFixed(0)}% CONF`, x - 20, y - 35);
          ctx.fillStyle = '#888';
          ctx.fillText(`${obj.state.replace('_', ' ')}`, x - 20, y + 15);
        }

        // Object Body
        const objColor = obj.classification === 'elephant' ? '#8b5cf6' : 
                         obj.classification === 'cattle' ? '#10b981' : 
                         obj.classification === 'human' ? '#3b82f6' : '#f43f5e';
        
        ctx.fillStyle = objColor;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow if detected
        if (obj.detected && params.isAISystemEnabled) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = objColor;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Train (Fixed at bottom)
      const trainY = height - 50;
      ctx.fillStyle = '#f97316';
      
      // Braking Glow
      if (state.brakingLevel !== 'none') {
        ctx.shadowBlur = state.brakingLevel === 'emergency' ? 30 : 15;
        ctx.shadowColor = state.brakingLevel === 'emergency' ? '#ef4444' : '#eab308';
      }
      
      ctx.fillRect(width / 2 - 20, trainY, 40, 80);
      ctx.shadowBlur = 0;
      
      // Train Lights
      const gradient = ctx.createRadialGradient(width / 2, trainY, 0, width / 2, trainY, 300);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(width / 2, trainY);
      ctx.arc(width / 2, trainY, 300, -Math.PI * 0.7, -Math.PI * 0.3);
      ctx.fill();

      // Failure Mode Overlay
      if (params.failureMode !== 'none') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`SYSTEM DEGRADED: ${params.failureMode.toUpperCase().replace('_', ' ')}`, width / 2, 40);
        ctx.textAlign = 'left';
      }

      // Thermal View Overlay (if night)
      if (isNight && params.isAISystemEnabled) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
        ctx.fillRect(0, 0, width, height);
      }

      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [state, params]);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={450} 
      className="w-full h-full object-cover"
    />
  );
}
