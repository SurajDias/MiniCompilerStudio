import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { Activity, Cpu, HardDrive, Target, Zap } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
//  localStorage key constants
//  Must match exactly what EditorPage.jsx writes.
// ─────────────────────────────────────────────────────────────
const LS_LATEST  = 'telemetry_latest';
const LS_HISTORY = 'telemetry_history';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

// Safe JSON parse — returns fallback on any error
const safeParse = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
};

// Convert a flat array of numbers into Recharts-friendly objects
// e.g. [32, 45] → [{ time: 0, value: 32 }, { time: 1, value: 45 }]
const toChartPoints = (arr) =>
  arr.map((value, i) => ({ time: i, value }));

// Build the 5-bar stage latency array from a stages object
const toStagesArray = (stages = {}) => [
  { name: 'Lexer',     duration: stages.lexer     || 0 },
  { name: 'Parser',    duration: stages.parser    || 0 },
  { name: 'Semantic',  duration: stages.semantic  || 0 },
  { name: 'TAC',       duration: stages.tac       || 0 },
  { name: 'Optimizer', duration: stages.optimizer || 0 },
];

// Empty chart-compatible arrays shown before the first run
const EMPTY_CHART = [{ time: 0, value: 0 }];
const EMPTY_STAGES = toStagesArray();

// ─────────────────────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────────────────────
const TelemetryPage = () => {

  // ── Scalar card values ──
  const [latestCpu,  setLatestCpu]  = useState(0);
  const [latestMem,  setLatestMem]  = useState(0);
  const [latency,    setLatency]    = useState(null);   // null = no run yet
  const [runCount,   setRunCount]   = useState(0);

  // ── Chart histories (arrays of { time, value }) ──
  const [cpuData,    setCpuData]    = useState(EMPTY_CHART);
  const [memData,    setMemData]    = useState(EMPTY_CHART);

  // ── Stage bar chart ──
  const [stagesData, setStagesData] = useState(EMPTY_STAGES);

  // ─────────────────────────────────────────────────────────
  //  Read from localStorage and update all state
  //  Called on mount and every time EditorPage fires a run
  // ─────────────────────────────────────────────────────────
  const syncFromStorage = () => {
    // ── Latest snapshot (for scalar cards + stage bars) ──
    const latest = safeParse(LS_LATEST, null);
    if (latest) {
      setLatestCpu(Number(latest.cpu)    || 0);
      setLatestMem(Number(latest.memory) || 0);
      setLatency(Number(latest.latency)  || 0);
      setStagesData(toStagesArray(latest.stages));
    }

    // ── Rolling history (for line/area graphs) ──
    const history = safeParse(LS_HISTORY, { cpu: [], mem: [], runCount: 0 });
    if (history.cpu.length  > 0) setCpuData(toChartPoints(history.cpu));
    if (history.mem.length  > 0) setMemData(toChartPoints(history.mem));
    setRunCount(history.runCount || 0);
  };

  // ─────────────────────────────────────────────────────────
  //  Effect: sync once on mount, then listen for updates
  //
  //  REMOVED: setInterval, Math.random(), fake initial data
  //
  //  EditorPage dispatches 'telemetry-updated' (a custom event)
  //  on the same window object after every successful run.
  //  We also listen for the native 'storage' event which fires
  //  when OTHER browser tabs write to localStorage — so the
  //  Telemetry tab updates even if it's open in a separate tab.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Read whatever data already exists (e.g. from a previous session)
    syncFromStorage();

    // React to a run triggered in the same browser tab
    window.addEventListener('telemetry-updated', syncFromStorage);

    // React to a run triggered from a different browser tab
    window.addEventListener('storage', syncFromStorage);

    return () => {
      window.removeEventListener('telemetry-updated', syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Derived display values
  // ─────────────────────────────────────────────────────────
  const displayLatency = latency === null
    ? '—'
    : `${Number(latency).toFixed(2)}ms`;

  const displayRuns = runCount > 0
    ? runCount.toLocaleString()
    : '—';

  // ─────────────────────────────────────────────────────────
  //  Custom Recharts tooltip (untouched from original)
  // ─────────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 border border-gray-800 p-3 rounded font-mono text-xs shadow-sm backdrop-blur">
          <p className="text-gray-400 mb-1">{`Run #${label}`}</p>
          <p className="text-cyan-400">{`Utilization: ${payload[0].value}%`}</p>
        </div>
      );
    }
    return null;
  };

  // ─────────────────────────────────────────────────────────
  //  JSX — layout, classNames, Recharts structure: untouched
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

        {/* Status badge: shows IDLE until first run, then LAST_RUN timestamp */}
        <div className="px-4 py-2 bg-green-500/5 border border-green-500/20 rounded text-green-400 font-mono text-sm flex items-center shadow-none">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-3 border border-black"></span>
          {runCount > 0 ? `RUN_${runCount}_COMPLETE` : 'AWAITING_RUN'}
        </div>
      </div>

      {/* ── Top Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            title: 'CPU USAGE',
            // Real value from backend — updated on each RUN PIPELINE click
            val:   runCount > 0 ? `${latestCpu}%` : '—',
            icon:  <Cpu />,
            color: 'cyan-400',
          },
          {
            title: 'MEMORY',
            // Real value from backend — updated on each RUN PIPELINE click
            val:   runCount > 0 ? `${latestMem}%` : '—',
            icon:  <HardDrive />,
            color: 'purple-400',
          },
          {
            title: 'COMPILATIONS',
            // Counts total successful pipeline runs since first use
            val:   displayRuns,
            icon:  <Target />,
            color: 'green-400',
          },
          {
            title: 'AVG LATENCY',
            // Real total pipeline duration returned by /telemetry
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

        {/* ── CPU Chart ── */}
        {/* Populated from localStorage history; only grows when user hits RUN */}
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

        {/* ── Memory Chart ── */}
        {/* Populated from localStorage history; only grows when user hits RUN */}
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

      {/* ── Stage Latency Bar Chart ── */}
      {/* Values are real ms measured by time.perf_counter() in Flask */}
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