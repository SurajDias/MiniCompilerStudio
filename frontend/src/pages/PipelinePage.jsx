import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, StepForward, RotateCcw, FileCode2, AlignLeft, Target, Settings2, Zap } from 'lucide-react';

const stages = [
  { id: 'source', title: 'SOURCE_CODE', icon: <FileCode2 size={24} />, desc: 'Raw character stream input', color: 'border-gray-500' },
  { id: 'lexer', title: 'LEXICAL_ANALYSIS', icon: <AlignLeft size={24} />, desc: 'Tokenization & Regex pattern matching', color: 'border-cyan' },
  { id: 'parser', title: 'SYNTAX_PARSER', icon: <Target size={24} />, desc: 'Abstract Syntax Tree (AST) generation', color: 'border-purple' },
  { id: 'tac', title: 'TAC_GENERATOR', icon: <Settings2 size={24} />, desc: 'Three-Address Code intermediate representation', color: 'border-pink-500' },
  { id: 'optimizer', title: 'CODE_OPTIMIZER', icon: <Zap size={24} />, desc: 'Dead code elimination & register allocation', color: 'border-green-400' }
];

const PipelinePage = () => {
  const [activeStep, setActiveStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  // 🔥 NEW: store backend data
  const [code] = useState(`a = 2 * 3;
b = a + 0;`);

  const [tokens, setTokens] = useState([]);
  const [syntax, setSyntax] = useState('');
  const [tac, setTac] = useState([]);
  const [optimized, setOptimized] = useState([]);

  // 🔥 FETCH ON PLAY
  const fetchPipeline = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      setTokens(data.tokens || []);
      setSyntax(data.syntax || "");
      setTac(data.tac || []);
      setOptimized(data.optimized || []);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= stages.length - 1) {
             setIsPlaying(false);
             return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (!isPlaying) {
      fetchPipeline(); // 🔥 fetch before animation
    }

    if (activeStep >= stages.length - 1) setActiveStep(-1);
    setIsPlaying(!isPlaying);
  };

  const handleStep = () => {
    setIsPlaying(false);
    if (activeStep < stages.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setActiveStep(-1);
  };

  // 🔥 FUNCTION TO SHOW DATA PER STEP
  const getStageOutput = (id) => {
    switch (id) {
      case 'source':
        return code;
      case 'lexer':
        return tokens.join("\n");
      case 'parser':
        return syntax;
      case 'tac':
        return tac.join("\n");
      case 'optimizer':
        return optimized.join("\n");
      default:
        return "";
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center p-6 relative z-10">
      
      {/* Header */}
      <div className="w-full max-w-4xl bg-black/40 border border-gray-800 rounded-xl p-6 mb-12 flex items-center justify-between">
        <div>
          <h2 className="font-orbitron text-xl tracking-widest text-cyan-400">COMPILATION_PIPELINE</h2>
          <p className="text-gray-400 text-sm mt-1">Real-time execution sequence monitoring</p>
        </div>
        
        <div className="flex space-x-4">
           <button onClick={handlePlayPause} className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-cyan-400">
             {isPlaying ? <Pause size={18} /> : <Play size={18} />}
           </button>
           <button onClick={handleStep} className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-purple-400">
             <StepForward size={18} />
           </button>
           <button onClick={handleReset} className="w-12 h-12 rounded-full border border-gray-600 flex items-center justify-center text-gray-400">
             <RotateCcw size={20} />
           </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl flex flex-col items-center relative">
        
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-gray-800" />

        <motion.div 
           className="absolute top-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-cyan via-purple to-green-400"
           initial={{ height: 0 }}
           animate={{ height: activeStep >= 0 ? `${(activeStep / (stages.length - 1)) * 100}%` : "0%" }}
        />

        {stages.map((stage, index) => {
          const isActive = index === activeStep;
          const isPassed = index < activeStep;
          
          return (
            <div key={stage.id} className="relative w-full flex justify-center items-center my-6">
               
               <div className={`relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center bg-[#0B0F1A] border ${
                   isActive ? stage.color : isPassed ? stage.color : 'border-gray-800'
               }`}>
                 {stage.icon}
               </div>

               <div className={`absolute top-1/2 -translate-y-1/2 w-[calc(50%-3rem)] ${index % 2 === 0 ? 'right-0 pl-12' : 'left-0 pr-12'}`}>
                  
                  <h3 className="text-white text-sm mb-1">{stage.title}</h3>

                  {/* 🔥 REAL DATA OUTPUT */}
                  {isActive && (
                    <div className="mt-3 p-3 text-xs font-mono rounded border border-cyan-400 bg-black/60 whitespace-pre-wrap max-h-40 overflow-auto">
                      {getStageOutput(stage.id) || "Processing..."}
                    </div>
                  )}

               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelinePage;