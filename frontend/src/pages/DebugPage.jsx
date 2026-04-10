import React, { useState, useEffect } from 'react';
import { Bug, Terminal as TerminalIcon, ShieldAlert, Cpu, CheckCircle2, Zap } from 'lucide-react';
import Editor from '@monaco-editor/react';

const initialCode = `function test(buffer: bytes) {
    let a: string = buffer.readInt32(0);
    let b: string = buffer.readInt32(4);
}`;

const DebugPage = () => {
  const [code, setCode] = useState(initialCode);
  const [analysis, setAnalysis] = useState(null);
  const [isPatching, setPatching] = useState(false);
  const [fixed, setFixed] = useState(false);

  // 🔥 ANALYSIS
  const runAnalysis = async (currentCode) => {
    try {
      const res = await fetch("http://127.0.0.1:5000/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ code: currentCode })
      });

      const data = await res.json();
      setAnalysis(data);
      setFixed(!data.error);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    runAnalysis(code);
  }, [code]);

  // 🔥 FIX ALL ERRORS
  const applyFix = async () => {
    setPatching(true);

    try {
      const res = await fetch("http://127.0.0.1:5000/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      setAnalysis(data);

      if (data.fixed_code) {
        setCode(data.fixed_code);
      }

    } catch (err) {
      console.error(err);
    }

    setPatching(false);
  };

  return (
    <div className="h-full w-full flex flex-col px-4 pb-4">
      <div className="flex flex-1 gap-6">

        {/* LEFT */}
        <div className="flex-[3] bg-[#0a0d16] border rounded-xl overflow-hidden relative">
          <div className="h-12 flex justify-between items-center px-4 border-b">
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <Bug size={16} className="text-red-400" />
              multi_error.mc
            </div>

            {analysis?.error ? (
              <span className="text-red-400 text-xs flex items-center">
                <ShieldAlert size={14} className="mr-1" />
                {analysis.errors?.length} ERRORS
              </span>
            ) : (
              <span className="text-green-400 text-xs flex items-center">
                <CheckCircle2 size={14} className="mr-1" />
                STABLE
              </span>
            )}
          </div>

          <Editor
            height="100%"
            defaultLanguage="typescript"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{ readOnly: false }}
          />

          {isPatching && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <Cpu className="animate-spin text-cyan-400" size={40} />
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex-[2] bg-[#0E121C] border rounded-xl p-6">

          {!fixed ? (
            <>
              <div className="mb-6">
                <h4 className="text-red-400 text-xs mb-2 flex items-center">
                  <TerminalIcon size={14} className="mr-2" />
                  ANALYSIS
                </h4>

                {analysis?.errors?.map((err, index) => (
                  <p key={index} className="text-gray-300 text-sm mb-2">
                    Line {err.line + 1}: {err.message}
                  </p>
                ))}
              </div>

              <button onClick={applyFix} className="text-cyan-400 text-xs">
                FIX ALL ERRORS →
              </button>
            </>
          ) : (
            <div className="text-center">
              <CheckCircle2 className="text-green-400 mx-auto mb-3" size={30} />
              <h3 className="text-green-400">ALL ISSUES RESOLVED</h3>
              <p className="text-gray-400 text-sm mt-2">
                Code is clean and validated.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DebugPage;