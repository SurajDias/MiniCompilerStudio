import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Code2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
//  localStorage key constants
//  (must match exactly what TelemetryPage.jsx reads)
// ─────────────────────────────────────────────────────────────
const LS_LATEST  = 'telemetry_latest';   // single snapshot object
const LS_HISTORY = 'telemetry_history';  // { cpu[], mem[], runCount }
const MAX_HISTORY = 20;

// ── Helper: read history from localStorage (or return empty) ──
const readHistory = () => {
  try {
    const raw = localStorage.getItem(LS_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { cpu: [], mem: [], runCount: 0 };
};

// ── Helper: append one value to a rolling array (max 20) ──
const appendRolling = (arr, value) =>
  [...arr.slice(-(MAX_HISTORY - 1)), value];

const EditorPage = () => {
  const [activeTab, setActiveTab] = useState('tokens');
  const [isRunning, setIsRunning] = useState(false);

  const [code, setCode] = useState(`a = 2 * 3;\nb = a + 0;`);

  const [tokens,    setTokens]    = useState([]);
  const [syntax,    setSyntax]    = useState('');
  const [tac,       setTac]       = useState([]);
  const [optimized, setOptimized] = useState([]);
  const [telemetry, setTelemetry] = useState(null);

  const handleRun = async () => {
    setIsRunning(true);

    try {
      // ── Parallel API calls (unchanged) ──
      const [compileRes, telemetryRes] = await Promise.all([
        fetch('http://127.0.0.1:5000/compile', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ code }),
        }),
        fetch('http://127.0.0.1:5000/telemetry', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ code }),
        }),
      ]);

      const compileData   = await compileRes.json();
      const telemetryData = await telemetryRes.json();

      console.log('Compile:',   compileData);
      console.log('Telemetry:', telemetryData);

      // ── Set compiler output state (unchanged) ──
      setTokens(compileData.tokens    || []);
      setSyntax(compileData.syntax    || '');
      setTac(compileData.tac          || []);
      setOptimized(compileData.optimized || []);

      // ── Set local telemetry display (unchanged) ──
      setTelemetry(telemetryData);

      // ── [NEW] Persist telemetry to localStorage so TelemetryPage
      //         can read it without any polling or shared state. ──
      if (telemetryData && !telemetryData.error) {
        // 1. Save the latest raw snapshot
        localStorage.setItem(LS_LATEST, JSON.stringify(telemetryData));

        // 2. Append to rolling history arrays
        const prev    = readHistory();
        const updated = {
          cpu:      appendRolling(prev.cpu,  telemetryData.cpu    || 0),
          mem:      appendRolling(prev.mem,  telemetryData.memory || 0),
          runCount: prev.runCount + 1,
        };
        localStorage.setItem(LS_HISTORY, JSON.stringify(updated));

        // 3. Dispatch a storage event so TelemetryPage (same tab) reacts
        //    window.dispatchEvent is needed because the native 'storage'
        //    event only fires in OTHER tabs, not the originating tab.
        window.dispatchEvent(new Event('telemetry-updated'));
      }

      // ── Auto tab-switch (unchanged) ──
      if (compileData.syntax && compileData.syntax.includes('Error')) {
        setActiveTab('syntax');
      } else {
        setActiveTab('tokens');
        setTimeout(() => setActiveTab('tac'),       300);
        setTimeout(() => setActiveTab('optimized'), 600);
      }

    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  //  JSX — completely untouched from original
  // ─────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col z-10 relative px-4 pb-4">
      
      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full min-h-0">
        
        {/* Editor Section */}
        <div className="flex-[3] flex flex-col min-h-0 bg-[#0E121C] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
          <div className="h-14 border-b border-gray-800 bg-black/40 flex items-center justify-between px-4">
            <h2 className="font-orbitron tracking-widest text-cyan-400 text-sm flex items-center">
              <Code2 size={18} className="mr-2" /> SOURCE_EDITOR
            </h2>

            <button
              onClick={handleRun}
              disabled={isRunning}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded font-mono text-xs ${
                isRunning
                  ? 'bg-cyan-400/10 text-cyan-400/50 cursor-not-allowed'
                  : 'bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30'
              }`}
            >
              {isRunning && (
                <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
              )}
              <Play size={14} />
              <span>{isRunning ? 'COMPILING...' : 'RUN PIPELINE'}</span>
            </button>
          </div>
          
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="c"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
            />
          </div>
        </div>

        {/* Output Section */}
        <div className="flex-[2] flex flex-col bg-[#0E121C] border border-gray-800 rounded-xl overflow-hidden">
          
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {['tokens', 'syntax', 'tac', 'optimized'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs ${
                  activeTab === tab ? 'text-cyan-400' : 'text-gray-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Output */}
          <div className="p-4 overflow-auto text-sm font-mono">

            {activeTab === 'tokens' && (
              <pre>{tokens.length ? tokens.join('\n') : 'No tokens yet...'}</pre>
            )}

            {activeTab === 'syntax' && (
              <pre className={syntax.includes('Error') ? 'text-red-400' : 'text-cyan-400'}>
                {syntax || 'No syntax output yet...'}
              </pre>
            )}

            {activeTab === 'tac' && (
              <pre>{tac.length ? tac.join('\n') : 'No TAC generated...'}</pre>
            )}

            {activeTab === 'optimized' && (
              <pre className="text-green-400">
                {optimized.length ? optimized.join('\n') : 'No optimization output...'}
              </pre>
            )}

            {/* Telemetry inline display (unchanged) */}
            {telemetry && (
              <div className="mt-4 border-t border-gray-800 pt-3 text-xs text-gray-400">
                <div>⚡ Latency: {telemetry.latency} ms</div>
                <div>🧠 CPU: {telemetry.cpu}%</div>
                <div>💾 Memory: {telemetry.memory}%</div>
                <div className="mt-2">
                  <div className="text-gray-500">Stage Timing:</div>
                  {Object.entries(telemetry.stages).map(([k, v]) => (
                    <div key={k}>{k}: {v} ms</div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default EditorPage;