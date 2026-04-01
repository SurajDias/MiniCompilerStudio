import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Terminal as TerminalIcon, Bot, ArrowRight, ShieldAlert, Cpu, CheckCircle2, Zap } from 'lucide-react';
import Editor from '@monaco-editor/react';

const codeWithError = `// Telemetry Parsing Sequence
function parseHeader(buffer: bytes): Header {
    let offset = 0;
    
    // ERROR: Type mismatch, expected int32
    let version: string = buffer.readInt32(offset); 
    offset += 4;
    
    let length = buffer.readInt16(offset);
    
    return new Header(version, length);
}`;

const DebugPage = () => {
  const [isPatching, setPatching] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [code, setCode] = useState(codeWithError);

  const mockApplyFix = () => {
    setPatching(true);
    setTimeout(() => {
      setPatching(false);
      setFixed(true);
      setCode(codeWithError.replace(
        'let version: string = buffer.readInt32(offset);', 
        'let version: int32 = buffer.readInt32(offset);'
      ).replace(
        '// ERROR: Type mismatch, expected int32', 
        '// RESOLVED: Type aligned'
      ));
    }, 2000);
  };

  return (
    <div className="h-full w-full flex flex-col z-10 relative px-4 pb-4">
      <div className="flex-1 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 min-h-0">
        
        {/* Left: Code Editor (simulating debugger) */}
        <div className="flex-[3] flex flex-col h-full bg-[#0a0d16] border border-gray-800 rounded-xl overflow-hidden relative shadow-sm">
          <div className="h-12 bg-black/40 border-b border-gray-800 flex items-center px-4 justify-between">
            <div className="flex items-center space-x-2">
              <Bug size={16} className="text-red-400" />
              <span className="font-mono text-sm text-gray-300 tracking-wider">telemetry_parser.mc (DEBUG_MODE)</span>
            </div>
            
            {!fixed && (
              <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-xs font-mono flex items-center shadow-none">
                <ShieldAlert size={14} className="mr-2" />
                CRITICAL_SYNTAX_ERROR
              </span>
            )}
            {fixed && (
               <span className="px-3 py-1 bg-green-500/5 text-green-400 border border-green-500/20 rounded-md text-xs font-mono flex items-center shadow-none">
                <CheckCircle2 size={14} className="mr-2" />
                SYSTEM_STABLE
              </span>
            )}
          </div>
          
          <div className="flex-1 bg-[#0E121C] relative">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              theme="vs-dark"
              value={code}
              options={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 14,
                readOnly: true,
                minimap: { enabled: false },
                padding: { top: 20 },
              }}
            />
            {/* Simulated Error Highlight overlay */}
            {!fixed && (
              <div className="absolute top-[80px] left-0 right-0 h-[24px] bg-red-500/10 border-l-2 border-red-500 pointer-events-none transition-all" />
            )}
            
            {/* Scanning Overlay */}
            {isPatching && (
               <div className="absolute inset-0 bg-[#0E121C]/80 backdrop-blur-[2px] flex items-center justify-center z-20">
                 <div className="flex flex-col items-center">
                   <Cpu className="text-cyan-400 mb-4 animate-spin" size={40} />
                   <div className="font-mono tracking-widest text-cyan-400 text-sm">APPLYING NEURAL PATCH...</div>
                 </div>
               </div>
            )}
          </div>
        </div>

        {/* Right: AI Assistant Panel */}
        <div className="flex-[2] flex flex-col h-full bg-[#0E121C] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-black/40 border-b border-gray-800 flex items-center opacity-90">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mr-3 relative shadow-none">
               <Bot className="text-purple-400" size={20} />
               <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#0E121C]"></span>
            </div>
            <div>
              <h3 className="font-orbitron font-medium tracking-wide text-gray-200 text-sm">JARVIS_INTELLIGENCE</h3>
              <p className="font-mono text-xs text-gray-500">Neural Debugging AI</p>
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-auto custom-scrollbar flex flex-col bg-[#0b0f1a]">
            <AnimatePresence>
               {!fixed ? (
                 <motion.div 
                   key="error-state"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                 >
                   <div className="bg-black/30 border border-red-500/20 p-4 rounded-lg mb-6 shadow-sm">
                     <h4 className="flex items-center text-red-400 font-mono text-xs mb-3 font-medium">
                        <TerminalIcon size={14} className="mr-2" /> ANALYSIS_REPORT
                     </h4>
                     <p className="text-gray-300 text-sm font-inter leading-relaxed">
                       Type mismatch detected on line 6. The function <code>buffer.readInt32()</code> returns an <code>int32</code>, but the variable <code>version</code> is strictly typed as <code>string</code>.
                     </p>
                   </div>
                   
                   <div className="bg-black/30 border border-purple-500/20 p-4 rounded-lg shadow-sm">
                      <h4 className="flex items-center text-purple-400 font-mono text-xs mb-3 font-medium">
                        <Zap size={14} className="mr-2" /> SUGGESTED_PATCH
                      </h4>
                      <div className="bg-[#0E121C] p-3 rounded border border-gray-800 font-mono text-xs text-gray-300 mb-5">
                        <div className="text-red-400 line-through opacity-70">- let version: string = buffer.readInt32(offset);</div>
                        <div className="text-green-400 mt-1">+ let version: int32 = buffer.readInt32(offset);</div>
                      </div>
                      
                      <button 
                        onClick={mockApplyFix}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-500/10 to-cyan-400/10 hover:from-purple-500/20 hover:to-cyan-400/20 border border-gray-700 hover:border-cyan-400/50 rounded-lg text-cyan-400 font-medium font-mono text-xs transition-all flex items-center justify-center group"
                      >
                         EXECUTE_PATCH <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </button>
                   </div>
                 </motion.div>
               ) : (
                 <motion.div 
                   key="success-state"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="flex-1 flex flex-col items-center justify-center text-center"
                 >
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-6 relative">
                       <CheckCircle2 size={32} className="text-green-400" />
                    </div>
                    <h3 className="font-orbitron font-medium tracking-wide text-green-400 text-lg mb-2">PATCH_SUCCESSFUL</h3>
                    <p className="text-gray-400 font-inter text-sm max-w-[250px] leading-relaxed">
                      The abstract syntax tree has been re-evaluated and no type conflicts remain.
                    </p>
                    <button 
                      onClick={() => { setFixed(false); setCode(codeWithError); }}
                      className="mt-8 px-4 py-2 border border-gray-700 rounded text-xs font-mono text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                    >
                      RESET_SIMULATION
                    </button>
                 </motion.div>
               )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="h-10 mt-6 bg-black/40 border border-gray-800 rounded-lg flex items-center px-4 relative overflow-hidden flex-shrink-0 shadow-sm">
        <div className="flex items-center text-xs font-mono text-gray-400 z-10 w-full justify-between">
          <span>SYSTEM_STATUS</span>
          <span className={isPatching ? 'text-cyan-400' : fixed ? 'text-green-400' : 'text-red-400'}>
            {isPatching ? 'HOT-PATCHING...' : fixed ? 'STABLE' : 'CRITICAL_ALERTS_DETECTED'}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 h-0.5 bg-gray-900 w-full" />
        <motion.div 
           className={`absolute bottom-0 left-0 h-[2px] ${fixed ? 'bg-green-400' : isPatching ? 'bg-cyan-400' : 'bg-red-500'}`}
           initial={{ width: '40%' }}
           animate={{ width: fixed ? '100%' : isPatching ? '70%' : '40%' }}
           transition={{ duration: isPatching ? 2 : 0.5 }}
        />
      </div>
    </div>
  );
};

export default DebugPage;
