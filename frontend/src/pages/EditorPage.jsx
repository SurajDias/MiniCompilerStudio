import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Code2 } from 'lucide-react';

const LS_LATEST  = 'telemetry_latest';
const LS_HISTORY = 'telemetry_history';
const MAX_HISTORY = 20;

const LS_PROJECTS = "compiler_projects";
const LS_ACTIVE   = "active_project";

const readHistory = () => {
  try {
    const raw = localStorage.getItem(LS_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { cpu: [], mem: [], runCount: 0 };
};

const appendRolling = (arr, value) =>
  [...arr.slice(-(MAX_HISTORY - 1)), value];

const EditorPage = () => {

  const [activeTab, setActiveTab] = useState('tokens');
  const [isRunning, setIsRunning] = useState(false);
  const [explainMode, setExplainMode] = useState(false);

  const [code, setCode] = useState('');

  const [tokens, setTokens] = useState([]);
  const [syntax, setSyntax] = useState('');
  const [tac, setTac] = useState([]);
  const [optimized, setOptimized] = useState([]);
  const [telemetry, setTelemetry] = useState(null);

  useEffect(() => {
    const projects = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]");
    const activeId = localStorage.getItem(LS_ACTIVE);

    const project = projects.find(p => p.id == activeId);

    if (project) {
      setCode(project.code || "");
    } else {
      setCode(`a = 2 * 3;\nb = a + 0;`);
    }
  }, []);

  const saveToProject = (newCode) => {
    const projects = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]");
    const activeId = localStorage.getItem(LS_ACTIVE);

    const updated = projects.map(p => {
      if (p.id == activeId) {
        return { ...p, code: newCode, lastOpened: "just now" };
      }
      return p;
    });

    localStorage.setItem(LS_PROJECTS, JSON.stringify(updated));
  };

  const updateProjectStatus = (status) => {
    const projects = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]");
    const activeId = localStorage.getItem(LS_ACTIVE);

    const updated = projects.map(p => {
      if (p.id == activeId) {
        return { ...p, status };
      }
      return p;
    });

    localStorage.setItem(LS_PROJECTS, JSON.stringify(updated));
  };

  const handleRun = async () => {
    setIsRunning(true);

    try {
      const [compileRes, telemetryRes] = await Promise.all([
        fetch('http://127.0.0.1:5000/compile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        }),
        fetch('http://127.0.0.1:5000/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        }),
      ]);

      const compileData = await compileRes.json();
      const telemetryData = await telemetryRes.json();

      setTokens(compileData.tokens || []);
      setSyntax(compileData.syntax || '');
      setTac(compileData.tac || []);
      setOptimized(compileData.optimized || []);
      setTelemetry(telemetryData);

      // 🔥 SAVE CODE FOR PIPELINE
      localStorage.setItem("pipeline_code", code);
      window.dispatchEvent(new Event("pipeline-update"));

      // 🔥 FIX: SAVE COMBINED DATA (IMPORTANT)
      if (telemetryData && !telemetryData.error) {
        const combinedData = {
          ...telemetryData,
          tokens: compileData.tokens,
          syntax: compileData.syntax,
          optimized: compileData.optimized
        };

        localStorage.setItem(LS_LATEST, JSON.stringify(combinedData));

        const prev = readHistory();
        const updated = {
          cpu: appendRolling(prev.cpu, telemetryData.cpu || 0),
          mem: appendRolling(prev.mem, telemetryData.memory || 0),
          runCount: prev.runCount + 1,
        };

        localStorage.setItem(LS_HISTORY, JSON.stringify(updated));
        window.dispatchEvent(new Event('telemetry-updated'));
      }

      if (compileData.syntax && compileData.syntax.includes("Error")) {
        updateProjectStatus("FAILED_BUILD");
      } else {
        updateProjectStatus("STABLE");
      }

      if (compileData.syntax && compileData.syntax.includes('Error')) {
        setActiveTab('syntax');
      } else {
        setActiveTab(explainMode ? 'explain' : 'tokens');
      }

    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const getExplanation = () => {
    return `
Step 1: Tokenization
${tokens.join('\n')}

Step 2: Parsing (AST)
${syntax}

Step 3: TAC Generation
${tac.join('\n')}

Step 4: Optimization
${optimized.join('\n')}
`;
  };

  return (
    <div className="h-full w-full flex flex-col px-4 pb-4">
      
      <div className="flex-1 flex flex-col lg:flex-row gap-6">

        <div className="flex-[3] flex flex-col bg-[#0E121C] border rounded-xl">
          <div className="h-14 flex justify-between px-4 items-center border-b">
            <h2 className="text-cyan-400 flex items-center">
              <Code2 size={18} className="mr-2" /> SOURCE_EDITOR
            </h2>

            <div className="flex items-center gap-3">
              <button onClick={() => setExplainMode(!explainMode)}
                className={`text-xs px-3 py-1 rounded ${
                  explainMode ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300'
                }`}>
                Explain Mode
              </button>

              <button onClick={handleRun} className="text-cyan-400">
                <Play size={16} />
              </button>
            </div>
          </div>

          <Editor
            height="100%"
            defaultLanguage="c"
            theme="vs-dark"
            value={code}
            onChange={(val) => {
              setCode(val || '');
              saveToProject(val || '');
            }}
          />
        </div>

        <div className="flex-[2] flex flex-col bg-[#0E121C] border rounded-xl">
          
          <div className="flex border-b">
            {['tokens', 'syntax', 'tac', 'optimized', 'explain'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs ${
                  activeTab === tab ? 'text-cyan-400' : 'text-gray-500'
                }`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4 overflow-auto text-sm font-mono">
            {activeTab === 'tokens' && <pre>{tokens.join('\n')}</pre>}
            {activeTab === 'syntax' && <pre>{syntax}</pre>}
            {activeTab === 'tac' && <pre>{tac.join('\n')}</pre>}
            {activeTab === 'optimized' && <pre>{optimized.join('\n')}</pre>}
            {activeTab === 'explain' && <pre className="text-green-400">{getExplanation()}</pre>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditorPage;