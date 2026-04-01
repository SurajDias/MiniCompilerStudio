import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0); 
  // 0: Init, 1: Spawn, 2: Lexical, 3: Parse Tree, 4: Optimize, 5: Enhanced, 6: Transition

  useEffect(() => {
    // Exact 6 seconds sequence
    const sequence = [
      { p: 1, t: 1000 },  // 1.0s: Spawn elements
      { p: 2, t: 2000 },  // 2.0s: Loading lexical analysis
      { p: 3, t: 3200 },  // 3.2s: Constructing parse tree
      { p: 4, t: 4400 },  // 4.4s: Optimizing intermediate code
      { p: 5, t: 5500 },  // 5.5s: System Intelligence Enhanced
      { p: 6, t: 6000 },  // 6.0s: Final flash out and route
    ];

    const timers = sequence.map(seq => setTimeout(() => setPhase(seq.p), seq.t));

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase === 6) {
      navigate('/');
    }
  }, [phase, navigate]);

  // Orbiting elements configuration
  const elements = [
    { id: 1, label: 'q0', type: 'node', delay: 0 },
    { id: 2, label: 'INT', type: 'token', delay: 0.1 },
    { id: 3, label: 'a(b)*', type: 'regex', delay: 0.2 },
    { id: 4, label: 'q1', type: 'node', delay: 0 },
    { id: 5, label: 'FLOAT', type: 'token', delay: 0.1 },
    { id: 6, label: 'AST_NODE', type: 'tree', delay: 0.2 },
    { id: 7, label: 'ε', type: 'transition', delay: 0 },
    { id: 8, label: 'TAC', type: 'code', delay: 0.1 },
  ];

  // Helper to determine if an element is absorbed based on phase
  const isAbsorbed = (type) => {
    if (phase >= 2 && (type === 'token' || type === 'regex')) return true;
    if (phase >= 3 && (type === 'tree' || type === 'node' || type === 'transition')) return true;
    if (phase >= 4 && type === 'code') return true;
    return false;
  };

  const getStatusText = () => {
    if (phase === 0 || phase === 1) return "SYNCHRONIZING CORE";
    if (phase === 2) return "LOADING LEXICAL ANALYSIS...";
    if (phase === 3) return "CONSTRUCTING PARSE TREE...";
    if (phase === 4) return "OPTIMIZING INTERMEDIATE CODE...";
    if (phase === 5) return "SYSTEM INTELLIGENCE ENHANCED";
    return "";
  };

  // Robot dynamic properties
  const getEyeScale = () => {
    if (phase === 5) return 2.5; // Final glowing eyes
    if (phase >= 2) return 1.5; // Absorbing state
    return 1;
  };

  const getEyeGlow = () => {
     if (phase === 5) return 'shadow-[0_0_40px_rgba(0,229,255,1)]';
     if (phase >= 2) return 'shadow-[0_0_20px_rgba(0,229,255,0.7)]';
     return 'shadow-none';
  };

  const getRobotScale = () => {
    if (phase === 5) return 20; // Massive scale up zoom effect right before transition (phase 6)
    return 1;
  };

  const getRobotOpacity = () => {
     if (phase === 5) return 0; // Fade to white flash as it scales
     return 1;
  };

  return (
    <div className="w-screen h-screen bg-[#0A0D16] flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background Grid & Particles */}
      <div className="absolute inset-0 bg-grid-cyber opacity-[0.2]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.05)_0%,transparent_60%)]" />

      {/* FLASH OVERLAY FOR TRANSITION */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 5 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 bg-cyan-400 z-50 pointer-events-none"
      />

      {/* Orbiting Elements Container */}
      <div className="absolute w-[800px] h-[800px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center">
        {elements.map((el, i) => {
          const angle = (i / elements.length) * Math.PI * 2;
          const radius = 250;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          const absorbed = isAbsorbed(el.type);

          return (
            <motion.div
              key={el.id}
              initial={{ opacity: 0, scale: 0, x: x * 0.5, y: y * 0.5 }}
              animate={
                absorbed 
                ? { x: 0, y: 0, scale: 0, opacity: 0 } // Fly into center (absorb)
                : phase >= 1 
                  ? { opacity: 1, scale: 1, x, y } // Spawn and orbit offset 
                  : { opacity: 0, scale: 0 } 
              }
              transition={{ 
                duration: absorbed ? 0.4 : 1, 
                delay: absorbed ? 0 : el.delay,
                type: absorbed ? "tween" : "spring",
                ease: "backIn"
              }}
              className="absolute pointer-events-none"
              style={{ x, y }} 
            >
              {/* Spinning container */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 15 + i * 2, ease: "linear" }}
              >
                {/* Element visualization based on type */}
                <div className={`flex items-center justify-center font-mono text-xs shadow-lg backdrop-blur bg-black/50 ${
                  el.type === 'node' ? 'w-12 h-12 rounded-full border border-cyan-400 text-cyan-400' :
                  el.type === 'token' ? 'px-3 py-1.5 rounded bg-purple-500/10 border border-purple-500/40 text-purple-400' :
                  el.type === 'tree' ? 'px-3 py-1.5 rounded bg-green-500/10 border border-green-500/40 text-green-400' :
                  'px-3 py-1.5 rounded border border-gray-600 text-gray-300'
                }`}>
                  {el.label}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* MAIN CHIBI ROBOT */}
      <motion.div 
        initial={{ y: 50, opacity: 0, scale: 0.8 }}
        animate={{ 
          y: phase === 5 ? 0 : [0, -15, 0], 
          opacity: getRobotOpacity(), 
          scale: getRobotScale() 
        }}
        transition={{ 
          y: { repeat: phase < 5 ? Infinity : 0, duration: 3, ease: "easeInOut" },
          opacity: { duration: 0.4 },
          scale: { duration: 0.5, ease: "easeIn" }
        }}
        className="relative z-20 w-64 h-64 mb-16"
      >
        {/* Glow behind robot during absorption */}
        <motion.div 
          animate={{ opacity: phase >= 2 && phase < 5 ? [0.2, 0.6, 0.2] : 0 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute inset-0 bg-cyan-400/30 blur-[100px] rounded-full"
        />

        {/* Main Head Container */}
        <div className="w-full h-full bg-[#121622] border-2 border-purple-500/30 rounded-[4rem] flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
          
          {/* Eyes */}
          <div className="flex space-x-12 mb-6">
            <motion.div 
              animate={{ scaleY: [1, 0.1, 1], scale: getEyeScale() }} 
              transition={{ scaleY: { repeat: Infinity, duration: 4, repeatDelay: 5 }, scale: { duration: 0.3 } }}
              className={`w-14 h-4 bg-cyan-400 rounded-full transition-all duration-300 ${getEyeGlow()}`}
            />
            <motion.div 
              animate={{ scaleY: [1, 0.1, 1], scale: getEyeScale() }} 
               transition={{ scaleY: { repeat: Infinity, duration: 4, repeatDelay: 5 }, scale: { duration: 0.3 } }}
              className={`w-14 h-4 bg-cyan-400 rounded-full transition-all duration-300 ${getEyeGlow()}`}
            />
          </div>
          
          {/* Mouth (Glows brighter on talking/absorbing) */}
          <motion.div 
             animate={{ width: phase >= 2 && phase < 5 ? [32, 64, 32] : 32 }}
             transition={{ repeat: Infinity, duration: 0.5 }}
             className="h-1.5 bg-cyan-400/80 rounded-full" 
          />
          
          {/* Scifi lines */}
          <div className="absolute top-0 left-6 w-1.5 h-full bg-cyan-400/10" />
          <div className="absolute bottom-6 right-0 w-full h-1.5 bg-purple-500/20" />
        </div>
        
        {/* Antennas */}
        <div className="absolute -top-8 left-12 w-3 h-12 bg-cyan-400/40 rounded-t-full" />
        <div className="absolute -top-12 right-12 w-4 h-16 bg-purple-500/40 rounded-t-full flex items-start justify-center">
           <motion.div 
             animate={{ scale: phase >= 2 ? [1, 1.5, 1] : 1, opacity: phase >= 2 ? 1 : 0.5 }}
             transition={{ repeat: Infinity, duration: 0.5 }}
             className="w-6 h-6 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.8)] -mt-3" 
           />
        </div>
      </motion.div>

      {/* DYNAMIC STATUS TEXT */}
      <motion.div 
        key={phase} // Forces re-animation on phase change
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: phase === 5 ? [0, 1, 1, 0] : 1, y: 0, scale: phase === 5 ? 1.2 : 1 }}
        exit={{ opacity: 0 }}
        className="absolute bottom-32 z-30"
      >
        <h2 className={`font-orbitron font-medium tracking-[0.2em] ${phase === 5 ? 'text-2xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'text-lg text-cyan-400'}`}>
          {getStatusText()}
        </h2>
      </motion.div>
      
      {/* Loading Progress Bar Mock */}
      {phase < 5 && (
        <div className="absolute bottom-20 w-64 h-1 bg-gray-800 rounded overflow-hidden z-30">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: `${(phase / 4) * 100}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
          />
        </div>
      )}

    </div>
  );
};

export default OnboardingPage;
