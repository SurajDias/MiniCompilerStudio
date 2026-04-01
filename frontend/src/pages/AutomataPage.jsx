import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { Controls, Background, useNodesState, useEdgesState, MarkerType, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Loader2, Sparkles, Box, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CUSTOM NODE ---
const StateNode = ({ data, isConnectable }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { label, nodeType, delay } = data; // nodeType: 'start' | 'accept' | 'normal'

  let borderStyle = 'border-[#374151]';
  let glowStyle = 'shadow-none';
  let innerClasses = '';

  if (nodeType === 'start') {
    borderStyle = 'border-cyan-400';
    glowStyle = isHovered ? 'shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'shadow-[0_0_8px_rgba(0,229,255,0.2)]';
  } else if (nodeType === 'accept') {
    borderStyle = 'border-purple-400';
    glowStyle = isHovered ? 'shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'shadow-[0_0_8px_rgba(168,85,247,0.2)]';
    innerClasses = 'ring-2 ring-purple-400/50 ring-inset'; // Double border effect
  } else {
    // normal state
    borderStyle = isHovered ? 'border-gray-400' : 'border-[#374151]';
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay || 0, duration: 0.3, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex justify-center items-center"
    >
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="opacity-0" />
      
      {nodeType === 'start' && (
        <div className="absolute -top-5 text-[10px] font-mono text-cyan-400 tracking-widest font-semibold flex items-center">
          START
        </div>
      )}

      {/* Tooltip */}
      <AnimatePresence>
         {isHovered && (
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.9 }}
             className="absolute -top-10 bg-[#0B0F1A] border border-gray-700 text-gray-200 text-xs font-mono px-3 py-1 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none"
           >
             State: {label}
           </motion.div>
         )}
      </AnimatePresence>

      <div className={`w-[50px] h-[50px] rounded-full bg-[#0a0d16] text-white flex items-center justify-center font-mono text-sm transition-all border-2 ${borderStyle} ${glowStyle} ${innerClasses}`}>
        {label}
      </div>

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="opacity-0" />
    </motion.div>
  );
};

// --- INITIAL MOCK DATA ---
const initialNodes = [
  { id: '1', type: 'stateNode', position: { x: 100, y: 200 }, data: { label: 'q0', nodeType: 'start', delay: 0.1 } },
  { id: '2', type: 'stateNode', position: { x: 300, y: 200 }, data: { label: 'q1', nodeType: 'normal', delay: 0.2 } },
  { id: '3', type: 'stateNode', position: { x: 500, y: 200 }, data: { label: 'q2', nodeType: 'accept', delay: 0.3 } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', label: 'a', animated: true, style: { stroke: '#4b5563', strokeWidth: 1.5 }, labelStyle: { fill: '#9ca3af', fontFamily: 'monospace', fontSize: 12 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#4b5563' } },
  { id: 'e2-3', source: '2', target: '3', label: 'ε', animated: true, style: { stroke: '#4b5563', strokeWidth: 1.5, strokeDasharray: '4,4' }, labelStyle: { fill: '#9ca3af', fontFamily: 'monospace', fontSize: 12 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#4b5563' } },
];

// --- TOKENIZER UTILS ---
const tokenizeRegex = (regexStr) => {
  const tokens = [];
  const operators = ['*', '|', '(', ')', '+', '?'];
  for (let i = 0; i < regexStr.length; i++) {
    const char = regexStr[i];
    if (operators.includes(char)) {
      tokens.push({ type: 'operator', value: char });
    } else {
      tokens.push({ type: 'literal', value: char });
    }
  }
  return tokens;
};

const AutomataPage = () => {
  const nodeTypes = useMemo(() => ({ stateNode: StateNode }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [mode, setMode] = useState('NFA'); // 'NFA' | 'DFA'
  const [regexInput, setRegexInput] = useState('a(b)*');
  const [activePattern, setActivePattern] = useState('a(b)*');
  const [isCompiling, setIsCompiling] = useState(false);
  
  const currentTokens = useMemo(() => tokenizeRegex(activePattern), [activePattern]);

  const onInitNFA = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setMode('NFA');
    setActivePattern('a(b)*');
    setRegexInput('a(b)*');
  }, [setNodes, setEdges]);

  const onOptimizeDFA = useCallback(() => {
    setNodes([
      { id: 'A', type: 'stateNode', position: { x: 150, y: 200 }, data: { label: 'A', nodeType: 'start', delay: 0.1 } },
      { id: 'B', type: 'stateNode', position: { x: 450, y: 200 }, data: { label: 'B', nodeType: 'accept', delay: 0.2 } },
    ]);
    setEdges([
      { id: 'eA-B', source: 'A', target: 'B', label: 'a', animated: true, style: { stroke: '#4b5563', strokeWidth: 1.5 }, labelStyle: { fill: '#9ca3af', fontFamily: 'monospace', fontSize: 12 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#4b5563' } },
      { id: 'eB-B', source: 'B', target: 'B', label: 'b', type: 'step', animated: true, style: { stroke: '#4b5563', strokeWidth: 1.5 }, labelStyle: { fill: '#9ca3af', fontFamily: 'monospace', fontSize: 12 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#4b5563' } },
    ]);
    setMode('DFA');
    setActivePattern('a(b)*');
    setRegexInput('a(b)*');
  }, [setNodes, setEdges]);

  const handleCompile = () => {
    if (!regexInput.trim()) return;
    setIsCompiling(true);
    
    setTimeout(() => {
      setActivePattern(regexInput);
      setIsCompiling(false);
      
      const newNodes = [];
      const newEdges = [];
      const maxNodes = Math.min(regexInput.length + 2, 8);
      
      for(let i = 0; i < maxNodes; i++) {
        let nType = 'normal';
        if (i === 0) nType = 'start';
        else if (i === maxNodes - 1) nType = 'accept';
        
        newNodes.push({
          id: `${i+1}`,
          type: 'stateNode',
          position: { x: 100 + (i * 200), y: 200 },
          data: { label: `q${i}`, nodeType: nType, delay: i * 0.1 }
        });
        
        if (i < maxNodes - 1) {
          const char = regexInput[Math.min(i, regexInput.length - 1)] || 'ε';
          const isEpsilon = char === 'ε' || char === '|' || char === '*' || char === '(' || char === ')'; 
          const activeStroke = i % 2 === 0 ? '#00E5FF' : '#4b5563';
          const strokeWidth = activeStroke === '#00E5FF' ? 2 : 1.5;

          newEdges.push({
            id: `e${i+1}-${i+2}`,
            source: `${i+1}`,
            target: `${i+2}`,
            label: char,
            animated: true,
            style: { stroke: activeStroke, strokeWidth: strokeWidth, strokeDasharray: isEpsilon ? '4,4' : 'none' },
            labelStyle: { fill: activeStroke === '#00E5FF' ? '#00E5FF' : '#9ca3af', fontFamily: 'monospace', fontSize: 12 },
            markerEnd: { type: MarkerType.ArrowClosed, color: activeStroke }
          });
        }
      }
      
      setNodes(newNodes);
      setEdges(newEdges);
      setMode('NFA');
    }, 800);
  };

  return (
    <div className="h-full w-full flex flex-col z-10 relative px-4 pb-4 overflow-y-auto overflow-x-hidden">
      
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 px-2 gap-4">
        <div>
          <h2 className="font-orbitron font-medium text-xl tracking-widest text-cyan-400">AUTOMATA_CORE</h2>
          <p className="text-gray-400 font-inter text-sm mt-1">Regex compilation and optimization visualizer</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-80">
            <input 
              type="text" 
              value={regexInput}
              onChange={(e) => setRegexInput(e.target.value)}
              placeholder="Enter Regex (e.g., a(b|c)*)"
              className="w-full bg-[#0E121C] border border-gray-700 text-gray-200 font-mono text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-cyan-400/50 transition-colors placeholder:text-gray-600"
              onKeyDown={(e) => e.key === 'Enter' && handleCompile()}
            />
          </div>
          
          <button 
            onClick={handleCompile}
            disabled={isCompiling || !regexInput.trim()}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-400/10 to-purple-500/10 hover:from-cyan-400/20 hover:to-purple-500/20 border border-cyan-400/30 rounded-lg text-cyan-400 font-medium tracking-wide font-mono text-xs flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed group whitespace-nowrap shadow-sm"
          >
            {isCompiling ? (
              <Loader2 size={16} className="animate-spin mr-2 text-cyan-400" />
            ) : (
              <Sparkles size={16} className="mr-2 group-hover:scale-110 transition-transform text-cyan-400" />
            )}
            {isCompiling ? 'GENERATING...' : 'GENERATE AUTOMATA'}
          </button>

          <div className="flex items-center bg-black/40 border border-gray-800 rounded-lg p-1 opacity-90 shrink-0 h-[42px] ml-0 sm:ml-2">
            <button 
              className={`px-3 sm:px-4 h-full rounded text-xs font-mono tracking-widest transition-all ${mode === 'NFA' ? 'bg-cyan-400/10 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={onInitNFA}
              disabled={isCompiling}
            >
              NFA
            </button>
            <button 
               className={`px-3 sm:px-4 h-full rounded text-xs font-mono tracking-widest transition-all ${mode === 'DFA' ? 'bg-purple-500/10 text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={onOptimizeDFA}
              disabled={isCompiling}
            >
              DFA
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* LEFT COMPONENT: Graph Rendered Area */}
        <div className="flex-[3] rounded-xl overflow-hidden bg-[#0A0D16] border border-gray-800 shadow-sm relative min-h-[400px]">
          
          {/* Legend Component */}
          <div className="absolute bottom-4 left-4 z-10 bg-[#0B0F1A]/90 border border-gray-800 p-3 rounded-lg backdrop-blur shadow-lg">
             <h4 className="text-gray-400 text-[10px] font-mono tracking-widest mb-3 border-b border-gray-800 pb-1">GRAPH_LEGEND</h4>
             <div className="flex flex-col gap-2">
                <div className="flex items-center text-xs text-gray-300 font-mono">
                  <div className="w-4 h-4 rounded-full border-2 border-cyan-400 shadow-[0_0_4px_rgba(0,229,255,0.3)] mr-2 flex items-center justify-center bg-[#0a0d16]" />
                  Start State
                </div>
                <div className="flex items-center text-xs text-gray-300 font-mono">
                  <div className="w-4 h-4 rounded-full border-2 border-[#374151] mr-2 bg-[#0a0d16]" />
                  Normal State
                </div>
                <div className="flex items-center text-xs text-gray-300 font-mono">
                  <div className="w-4 h-4 rounded-full border-2 border-purple-400 ring-2 ring-purple-400/50 ring-inset shadow-[0_0_4px_rgba(168,85,247,0.3)] bg-[#0a0d16] mr-2" />
                  Accept State
                </div>
                <div className="flex items-center text-xs text-gray-400 font-mono mt-1">
                  <div className="w-4 h-0.5 bg-gray-500 mr-2" /> Transition
                </div>
                <div className="flex items-center text-[10px] text-cyan-400 font-mono">
                  <div className="w-4 h-0.5 bg-cyan-400 shadow-[0_0_4px_rgba(0,229,255,0.4)] mr-2" /> Active Transition
                </div>
             </div>
          </div>

          {isCompiling && (
             <div className="absolute inset-0 z-20 bg-[#0A0D16]/80 backdrop-blur-sm flex flex-col items-center justify-center">
               <Loader2 size={40} className="text-cyan-400 animate-spin mb-4" />
               <p className="font-mono text-sm text-cyan-400 tracking-widest animate-pulse">COMPILING STRUCTURAL TOPOLOGY...</p>
             </div>
          )}

          <ReactFlow
            nodeTypes={nodeTypes}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            attributionPosition="bottom-right"
            minZoom={0.5}
            maxZoom={1.5}
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background color="#1f2937" gap={20} size={1} />
            <Controls position="bottom-right" className="bg-[#0B0F1A] border-gray-800 fill-white !shadow-none !mr-4 !mb-4" />
          </ReactFlow>
        </div>

        {/* RIGHT COMPONENT: Info sidebar */}
        <div className="flex-[1.2] flex flex-col gap-4">
          
          {/* REGEX BREAKDOWN CARD */}
          <div className="bg-[#0E121C] p-5 rounded-xl border border-gray-800 shadow-sm flex flex-col">
            <h3 className="font-orbitron text-gray-200 text-sm tracking-widest mb-4 flex items-center shrink-0">
              <Code2 size={16} className="mr-2 text-cyan-400" /> REGEX_BREAKDOWN
            </h3>
            
            <div className="space-y-4 text-sm font-inter">
              <div className="bg-black/40 border border-gray-800 p-3 rounded-lg overflow-x-auto custom-scrollbar">
                <span className="text-gray-500 font-mono text-xs block mb-2">Input Pattern:</span>
                <span className="text-white font-mono tracking-widest">{activePattern}</span>
              </div>
              
              <div className="flex flex-col gap-2 relative">
                <span className="text-gray-500 font-mono text-[10px] tracking-widest">TOKENIZED STREAM:</span>
                <div className="flex flex-wrap gap-2">
                  {currentTokens.map((token, idx) => (
                    <motion.span 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * idx }}
                      className={`px-2 py-1 rounded text-xs font-mono ${
                        token.type === 'operator' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                      }`}
                    >
                      {token.value}
                    </motion.span>
                  ))}
                </div>
                {currentTokens.length === 0 && (
                   <span className="text-gray-600 font-mono text-xs">Waiting for input stream...</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#0E121C] p-5 rounded-xl border border-gray-800 shadow-sm">
            <h3 className="font-orbitron text-gray-200 text-sm tracking-widest mb-4 flex items-center">
              <Box size={16} className="mr-2 text-purple-400" /> STATE_INFO
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">Generation Profile:</span>
                <span className={mode === 'NFA' ? 'text-cyan-400' : 'text-purple-400'}>{mode === 'NFA' ? 'THOMPSON_MCN' : 'SUBSET_CONSTRUCT'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">Total Nodes Allocated:</span>
                <span className="text-gray-300">{nodes.length}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">Active Transitions:</span>
                <span className="text-gray-300">{edges.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0E121C] p-5 rounded-xl border border-gray-800 shadow-sm flex-1 flex flex-col min-h-[160px]">
            <h3 className="font-orbitron text-gray-200 text-sm tracking-widest mb-4 flex items-center shrink-0">
              <Network size={16} className="mr-2 text-gray-400" /> LIVE_ROUTES
            </h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
              <AnimatePresence>
                {edges.map((edge, idx) => (
                  <motion.div 
                    key={edge.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-black/30 p-2 rounded border border-gray-800 text-xs font-mono flex items-center justify-between hover:border-gray-600 transition-colors cursor-default"
                  >
                    <span className="text-gray-400">{edge.source}</span>
                    <div className="flex items-center text-gray-600 px-2">
                      <span className="bg-[#1f2937] px-1.5 rounded text-white border border-[#374151] hover:text-cyan-400 transition-colors">{edge.label}</span>
                      <span className="mx-1">→</span>
                    </div>
                    <span className="text-gray-400">{edge.target}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AutomataPage;
