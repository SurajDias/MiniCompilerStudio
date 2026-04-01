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

  return (
    <div className="h-full w-full flex flex-col items-center p-6 relative z-10">
      
      {/* Header & Controls */}
      <div className="w-full max-w-4xl bg-black/40 border border-gray-800 rounded-xl p-6 mb-12 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="font-orbitron font-medium text-xl tracking-widest text-cyan-400">COMPILATION_PIPELINE</h2>
          <p className="text-gray-400 font-inter text-sm mt-1">Real-time execution sequence monitoring</p>
        </div>
        
        <div className="flex space-x-4">
           <button 
             onClick={handlePlayPause}
             className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/50 transition-all shadow-sm"
           >
             {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-1" />}
           </button>
           <button 
             onClick={handleStep}
             disabled={isPlaying || activeStep >= stages.length - 1}
             className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all disabled:opacity-30 disabled:hover:shadow-none shadow-sm"
           >
             <StepForward size={18} />
           </button>
           <button 
             onClick={handleReset}
             className="w-12 h-12 rounded-full border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
           >
             <RotateCcw size={20} />
           </button>
        </div>
      </div>

      {/* Vertical Pipeline Layout */}
      <div className="flex-1 w-full max-w-2xl flex flex-col items-center relative">
        
        {/* Connection Line Background */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-gray-800 rounded-full" />
        
        {/* Animated Active Line */}
        <motion.div 
           className="absolute top-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-cyan via-purple to-green-400 rounded-full shadow-[0_0_15px_rgba(0,229,255,0.8)]"
           initial={{ height: 0 }}
           animate={{ height: activeStep >= 0 ? `${(activeStep / (stages.length - 1)) * 100}%` : "0%" }}
           transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {/* Pipeline Stages */}
        {stages.map((stage, index) => {
          const isActive = index === activeStep;
          const isPassed = index < activeStep;
          
          return (
            <div key={stage.id} className="relative w-full flex justify-center items-center my-6 group">
               
               {/* Icon Node */}
               <motion.div 
                 className={`relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center bg-[#0B0F1A] border transition-all duration-300 ${
                   isActive ? `${stage.color} shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-105` : 
                   isPassed ? `${stage.color} opacity-60` : 
                   'border-gray-800 text-gray-700 opacity-40'
                 }`}
                 animate={{ rotate: isActive ? [0, -2, 2, -2, 0] : 0 }}
                 transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
               >
                 <div className={isActive || isPassed ? stage.color.replace('border-', 'text-') : 'text-gray-600'}>
                    {stage.icon}
                 </div>
               </motion.div>

               {/* Left/Right Content alternating */}
               <div className={`absolute top-1/2 -translate-y-1/2 w-[calc(50%-3rem)] ${index % 2 === 0 ? 'right-0 pl-12 text-left' : 'left-0 pr-12 text-right'}`}>
                  <motion.div
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: isActive || isPassed ? 1 : 0.3, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h3 className={`font-orbitron tracking-widest text-lg mb-1 ${isActive ? 'text-white text-shadow-glow' : 'text-gray-500'}`}>
                      {stage.title}
                    </h3>
                    <p className="font-mono text-xs text-gray-500">{stage.desc}</p>
                    
                    {/* Activity indicator if active */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`mt-3 p-3 text-xs font-mono rounded border ${stage.color} bg-[#0B0F1A]/80 inline-block`}
                        >
                          <span className="flex items-center text-cyan">
                            <Zap size={12} className="mr-2 animate-pulse" /> Processing chunks... [OK]
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelinePage;
