import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Code2, TerminalSquare, LayoutList, Fingerprint, Activity, ChevronRight } from 'lucide-react';

const EditorPage = () => {
  const [activeTab, setActiveTab] = useState('tokens');
  const [isRunning, setIsRunning] = useState(false);

  const defaultCode = `// Mini Compiler Studio OS
// Target Language: Subset-C

int fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

void main() {
    int result = fibonacci(10);
    print("Result: ", result);
}
`;

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
    }, 2000);
  };

  const mockTokens = [
    { type: 'KEYWORD', value: 'int', line: 4 },
    { type: 'IDENTIFIER', value: 'fibonacci', line: 4 },
    { type: 'SYMBOL', value: '(', line: 4 },
    { type: 'KEYWORD', value: 'int', line: 4 },
    { type: 'IDENTIFIER', value: 'n', line: 4 },
    { type: 'SYMBOL', value: ')', line: 4 },
    { type: 'SYMBOL', value: '{', line: 4 },
    { type: 'KEYWORD', value: 'if', line: 5 },
    { type: 'SYMBOL', value: '(', line: 5 },
  ];

  const mockTAC = `t1 = n <= 1
ifFalse t1 goto L1
return n
goto L2
L1:
t2 = n - 1
t3 = call fibonacci, t2
t4 = n - 2
t5 = call fibonacci, t4
t6 = t3 + t5
return t6
L2:`;

  return (
    <div className="h-full w-full flex flex-col z-10 relative px-4 pb-4">
      
      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full min-h-0">
        
        {/* Editor Section */}
        <div className="flex-[3] flex flex-col min-h-0 bg-[#0E121C] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
          <div className="h-14 border-b border-gray-800 bg-black/40 flex items-center justify-between px-4">
            <h2 className="font-orbitron tracking-widest text-cyan-400 text-sm flex items-center">
              <Code2 size={18} className="mr-2" /> SOURCE_EDITOR
            </h2>
            <div className="flex space-x-2">
              <button 
                onClick={handleRun}
                disabled={isRunning}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded transition-all font-mono text-xs ${isRunning ? 'bg-cyan-400/10 text-cyan-400/50 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-400/10 to-purple-500/10 border border-cyan-400/30 text-cyan-400 hover:from-cyan-400/20 hover:to-purple-500/20'}`}
              >
                {isRunning ? (
                  <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mr-1"></span>
                ) : (
                  <Play size={14} className="fill-cyan-400" />
                )}
                <span>{isRunning ? 'COMPILING...' : 'RUN PIPELINE'}</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 rounded-b-xl overflow-hidden bg-[#0A0D16]">
            <Editor
              height="100%"
              defaultLanguage="c"
              theme="vs-dark"
              value={defaultCode}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'JetBrains Mono',
                padding: { top: 20 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                renderLineHighlight: 'all'
              }}
            />
          </div>
        </div>

        {/* Outputs Section */}
        <div className="flex-[2] flex flex-col min-h-0 bg-[#0E121C] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
          
          {/* Tabs */}
          <div className="flex border-b border-gray-800 bg-black/40">
            {['tokens', 'syntax', 'tac', 'optimized'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-xs font-mono tracking-widest uppercase transition-all outline-none border-b-2 ${
                  activeTab === tab 
                    ? 'bg-white/5 border-cyan-400 text-cyan-400 font-medium' 
                    : 'border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            
            {activeTab === 'tokens' && (
              <div className="space-y-4">
                 <h3 className="font-orbitron tracking-widest text-cyan-400 text-sm flex items-center mb-4">
                   <LayoutList size={16} className="mr-2" /> LEXICAL_ANALYSIS
                 </h3>
                 <div className="space-y-2">
                   {mockTokens.map((token, i) => (
                     <div key={i} className="flex items-center justify-between p-2 rounded bg-black/40 border border-gray-800 font-mono text-xs hover:border-gray-600 transition-colors cursor-default">
                       <span className="text-gray-500">Line {token.line}</span>
                       <span className={`px-2 py-0.5 rounded ${
                         token.type === 'KEYWORD' ? 'bg-purple-500/20 text-purple-400' :
                         token.type === 'IDENTIFIER' ? 'bg-cyan-400/20 text-cyan-400' :
                         'bg-gray-700/50 text-gray-300'
                       }`}>{token.type}</span>
                       <span className="text-white">"{token.value}"</span>
                     </div>
                   ))}
                   <div className="p-2 text-center text-gray-500 text-xs font-mono border border-dashed border-gray-800 rounded">
                     ... {isRunning ? 'Processing' : '28 additional tokens'} ...
                   </div>
                 </div>
              </div>
            )}

            {activeTab === 'syntax' && (
               <div className="space-y-4">
                 <h3 className="font-orbitron tracking-widest text-purple-400 text-sm flex items-center mb-4">
                   <Fingerprint size={16} className="mr-2" /> SYNTAX_TREE
                 </h3>
                 <div className="font-mono text-sm text-gray-400 pl-4 border-l border-gray-800 space-y-2">
                    <p className="text-gray-300">Program</p>
                    <div className="pl-4 border-l border-gray-800 space-y-1">
                      <p className="text-purple-400">FunctionDecl (fibonacci)</p>
                      <div className="pl-4 border-l border-gray-800 space-y-1">
                        <p>Param (int n)</p>
                        <p>Block</p>
                        <div className="pl-4 border-l border-gray-800 space-y-1">
                          <p className="text-cyan-400">IfStmt</p>
                          <div className="pl-4 border-l border-gray-800">
                             <p>BinaryExpr (&lt;=)</p>
                             <p>ReturnStmt</p>
                          </div>
                        </div>
                      </div>
                    </div>
                 </div>
               </div>
            )}

            {activeTab === 'tac' && (
              <div className="space-y-4">
                 <h3 className="font-orbitron text-cyan-400 text-sm tracking-widest flex items-center mb-4">
                   <ChevronRight size={16} className="mr-2" /> INTERMEDIATE_CODE
                 </h3>
                 <pre className="font-mono text-sm text-gray-300 bg-black/50 p-4 border border-gray-800 rounded shadow-inner whitespace-pre-wrap">
                   {mockTAC}
                 </pre>
              </div>
            )}

            {activeTab === 'optimized' && (
              <div className="space-y-4">
                 <h3 className="font-orbitron text-green-400 text-sm tracking-widest flex items-center mb-4">
                   <Activity size={16} className="mr-2" /> OPTIMIZATION_PASS
                 </h3>
                 <div className="p-4 bg-green-400/5 border border-green-400/20 rounded">
                   <p className="text-green-400 font-mono text-sm mb-2">PASS: Constant Folding</p>
                   <p className="text-gray-400 text-xs">No opportunities found.</p>
                 </div>
                 <div className="p-4 bg-green-400/5 border border-green-400/20 rounded">
                   <p className="text-green-400 font-mono text-sm mb-2">PASS: Dead Code Elimination</p>
                   <p className="text-gray-400 text-xs text-green-300">Removed 2 unreachable basic blocks.</p>
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
