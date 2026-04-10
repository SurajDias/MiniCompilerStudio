import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { Activity, Cpu, HardDrive, Target, Zap } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────
const API_URL        = 'http://127.0.0.1:5000/telemetry';
const POLL_INTERVAL  = 3000;   // ms between backend polls
const HISTORY_LENGTH = 20;     // how many points to keep in rolling graphs

// Sample code sent on every poll so the pipeline always has something to run.
// Change this to whatever exercises your compiler most representatively.
const SAMPLE_CODE = `
int x = 10;
int y = 20;
int z = x + y;
if (z > 25) {
  z = z * 2;
}
`.trim();

// Flat zero-filled history used as the initial state before the first response
const makeHistory = () =>
  Array.from({ length: HISTORY_LENGTH }, (_, i) => ({ time: i, value: 0 }));

// ─────────────────────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────────────────────
const TelemetryPage = () => {
  // Rolling graph histories
  const [cpuData, setCpuData]   = useState(makeHistory);
  const [memData, setMemData]   = useState(makeHistory);

  // Live scalar values shown in the stat cards
  const [latestCpu,  setLatestCpu]  = useState(0);
  const [latestMem,  setLatestMem]  = useState(0);
  const [latency,    setLatency]    = useState(null);   // null = not yet fetched

  // Compiler stage bar chart  [{name, duration}, ...]
  const [stagesData, setStagesData] = useState([
    { name: 'Lexer',     duration: 0 },
    { name: 'Parser',    duration: 0 },
    { name: 'Semantic',  duration: 0 },
    { name: 'TAC',       duration: 0 },
    { name: 'Optimizer', duration: 0 },
  ]);

  // Total compilation count (incremented on every successful poll)
  const [compilationCount, setCompilationCount] = useState(0);

  // Monotonically increasing tick used as the x-axis key for rolling graphs
  const tickRef = useRef(HISTORY_LENGTH);

  // ── append a single new value onto a rolling 20-point history ──
  const appendToHistory = (prev, newValue) => {
    const tick = tickRef.current++;
    return [...prev.slice(1), { time: tick, value: newValue }];
  };

  // ── fetch one telemetry snapshot from the backend ──
  const fetchTelemetry = async () => {
    try {
      const res = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: SAMPLE_CODE }),
      });

      if (!res.ok) return;   // silently skip bad responses

      const data = await res.json();
      if (data.error) return;

      // ── update scalar cards ──
      const cpu = Number(data.cpu)    || 0;
      const mem = Number(data.memory) || 0;
      const lat = Number(data.latency) || 0;

      setLatestCpu(cpu);
      setLatestMem(mem);
      setLatency(lat);

      // ── append new data points to rolling histories ──
      setCpuData(prev => appendToHistory(prev, cpu));
      setMemData(prev => appendToHistory(prev, mem));

      // ── update stage latency bar chart ──
      if (data.stages) {
        setStagesData([
          { name: 'Lexer',     duration: Number(data.stages.lexer)     || 0 },
          { name: 'Parser',    duration: Number(data.stages.parser)    || 0 },
          { name: 'Semantic',  duration: Number(data.stages.semantic)  || 0 },
          { name: 'TAC',       duration: Number(data.stages.tac)       || 0 },
          { name: 'Optimizer', duration: Number(data.stages.optimizer) || 0 },
        ]);
      }

      // ── increment total compilation counter ──
      setCompilationCount(prev => prev + 1);

    } catch (_) {
      // Network error — keep showing last known values, do nothing else
    }
  };

  // ── poll on mount and then every POLL_INTERVAL ms ──
  useEffect(() => {
    fetchTelemetry();                             // immediate first fetch
    const id = setInterval(fetchTelemetry, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // ─────────────────────────────────────────────────────────
  //  CUSTOM TOOLTIP  (untouched from original)
  // ─────────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 border border-gray-800 p-3 rounded font-mono text-xs shadow-sm backdrop-blur">
          <p className="text-gray-400 mb-1">{`T-${label}ms`}</p>
          <p className="text-cyan-400">{`Utilization: ${payload[0].value}%`}</p>
        </div>
      );
    }
    return null;
  };

  // ─────────────────────────────────────────────────────────
  //  DERIVED DISPLAY VALUES
  // ─────────────────────────────────────────────────────────
  const displayLatency      = latency === null ? '—' : `${latency.toFixed(2)}ms`;
  const displayCompilations = compilationCount.toLocaleString();

  // ─────────────────────────────────────────────────────────
  //  JSX  (layout, classNames, Recharts structure — untouched)
  // ─────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col z-10 relative overflow-y-auto overflow-x-hidden p-2">
      <div className="flex items-center justify-between mb-8 px-2">
        <div>
          <h2 className="font-orbitron font-medium text-xl tracking-widest text-cyan-400">SYSTEM_TELEMETRY</h2>
          <p className="text-gray-400 font-inter text-sm mt-1 flex items-center">
            <Activity size={14} className="mr-2 text-purple-400" />
            Live diagnostics & execution metrics
          </p>
        </div>
        <div className="px-4 py-2 bg-green-500/5 border border-green-500/20 rounded text-green-400 font-mono text-sm flex items-center shadow-none">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-3 border border-black"></span>
          NODE_STABLE
        </div>
      </div>

      {/* ── Top Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            title: 'CPU USAGE',
            // Real value from backend, refreshes every poll
            val:   `${latestCpu}%`,
            icon:  <Cpu />,
            color: 'cyan-400',
          },
          {
            title: 'MEMORY',
            // Real value from backend, refreshes every poll
            val:   `${latestMem}%`,
            icon:  <HardDrive />,
            color: 'purple-400',
          },
          {
            title: 'COMPILATIONS',
            // Counts every successful backend round-trip since page load
            val:   displayCompilations,
            icon:  <Target />,
            color: 'green-400',
          },
          {
            title: 'AVG LATENCY',
            // Real total pipeline duration from backend
            val:   displayLatency,
            icon:  <Zap />,
            color: 'yellow-400',
          },
        ].map((stat, i) => (
          <div key={i} className="bg-black/40 border-gray-800 border p-5 rounded-xl flex items-center shadow-sm">
            <div className={`w-10 h-10 rounded-full bg-${stat.color.replace('-400','').replace('-500','')}/10 border border-${stat.color.replace('-400','')}/20 flex items-center justify-center text-${stat.color} mr-4`}>
              {stat.icon && React.cloneElement(stat.icon, { size: 18 })}
            </div>
            <div>
              <div className="text-gray-500 text-xs font-mono tracking-widest mb-1">{stat.title}</div>
              <div className="text-2xl font-orbitron font-medium text-white">{stat.val}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 h-64">

        {/* ── CPU Chart — now driven by real backend values ── */}
        <div className="bg-[#0E121C] border border-gray-800 p-5 rounded-xl flex flex-col shadow-sm">
          <h3 className="text-cyan-400 font-mono text-sm tracking-widest mb-4">NEURAL_PROCESSOR_LOAD</h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00E5FF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} opacity={0.5} />
                <XAxis dataKey="time" hide />
                <YAxis
                  domain={[0, 100]}
                  stroke="#4b5563"
                  tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#00E5FF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCpu)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Memory Chart — now driven by real backend values ── */}
        <div className="bg-[#0E121C] border border-gray-800 p-5 rounded-xl flex flex-col shadow-sm">
          <h3 className="text-purple-400 font-mono text-sm tracking-widest mb-4">MEMORY_ALLOCATION</h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={memData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} opacity={0.5} />
                <XAxis dataKey="time" hide />
                <YAxis
                  domain={[0, 100]}
                  stroke="#4b5563"
                  tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="stepAfter"
                  dataKey="value"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Stage Latency Bar Chart — real measured ms per compiler stage ── */}
      <div className="bg-[#0E121C] border border-gray-800 p-5 rounded-xl h-64 flex flex-col shadow-sm">
        <h3 className="text-gray-300 font-mono text-sm tracking-widest mb-4">STAGE_LATENCY_PROFILE (ms)</h3>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stagesData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} opacity={0.5} />
              <XAxis
                type="number"
                stroke="#4b5563"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}
                interval={0}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#1f2937', opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
              <Bar dataKey="duration" fill="#00E5FF" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default TelemetryPage;