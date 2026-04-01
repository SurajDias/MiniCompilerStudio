import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Lock, Code, Globe, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  
  const handleSystemInit = (e) => {
    e.preventDefault();
    navigate('/onboarding');
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-[80vh] min-h-[600px] bg-[#0E121C] rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
      
      {/* LEFT SIDE: Chibi AI Robot */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-black/50 border-r border-cyan/20 relative p-8">
        <div className="absolute top-4 left-4 text-xs font-mono text-cyan/70 tracking-widest flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan animate-pulse"></span>
          <span>SYS.CORE_V2.0</span>
        </div>
        
        {/* Floating Robot Animation */}
        <motion.div 
          animate={{ y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="relative z-10 w-48 h-48 mb-8"
        >
          {/* Main Head */}
          <div className="w-full h-full bg-[#121622] border border-purple-500/20 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
            {/* Eyes */}
            <div className="flex space-x-8 mb-4">
              <motion.div 
                animate={{ scaleY: [1, 0.1, 1] }} 
                transition={{ repeat: Infinity, duration: 3, repeatDelay: 4 }}
                className="w-10 h-3 bg-cyan-400/80 rounded-full"
              />
              <motion.div 
                animate={{ scaleY: [1, 0.1, 1] }} 
                transition={{ repeat: Infinity, duration: 3, repeatDelay: 4 }}
                className="w-10 h-3 bg-cyan-400/80 rounded-full"
              />
            </div>
            {/* Mouth */}
            <div className="w-8 h-1 bg-cyan/50 rounded-full" />
            
            {/* Scifi lines */}
            <div className="absolute top-0 left-4 w-1 h-full bg-cyan/10" />
            <div className="absolute bottom-4 right-0 w-full h-1 bg-purple/20" />
          </div>
          
          {/* Antennas */}
          <div className="absolute -top-6 left-8 w-2 h-8 bg-cyan/40 rounded-t-full" />
          <div className="absolute -top-8 right-8 w-3 h-10 bg-purple/40 rounded-t-full flex items-start justify-center">
             <div className="w-4 h-4 rounded-full bg-cyan shadow-neon-cyan animate-pulse -mt-2" />
          </div>
        </motion.div>

        <h2 className="text-sm font-semibold tracking-[0.2em] text-cyan-400 mb-2">SYNCHRONIZING CORE</h2>
        <div className="flex space-x-4 mt-6">
          <div className="px-3 py-1 bg-cyan/10 border border-cyan/30 rounded text-xs font-mono text-cyan">Memory: 98.2%</div>
          <div className="px-3 py-1 bg-purple/10 border border-purple/30 rounded text-xs font-mono text-purple flex items-center">
            <span className="w-1.5 h-1.5 bg-purple rounded-full mr-2 animate-pulse"></span>
            Status: Active
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Panel */}
      <div className="flex-1 p-8 md:p-12 flex flex-col justify-center relative bg-gradient-to-bl from-black to-[#0A0710]">
        
        <div className="mb-10">
          <h1 className="text-3xl font-orbitron font-medium tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
            MINI_COMPILER<br/><span className="text-white ml-2">STUDIO</span>
          </h1>
          <p className="text-gray-400 font-inter text-sm mt-2">Automated Code Synthesis Interface</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 mb-8 border-b border-gray-800 pb-2">
          <button 
            onClick={() => setActiveTab('login')}
            className={`font-orbitron tracking-wider text-sm pb-2 relative transition-colors ${activeTab === 'login' ? 'text-cyan' : 'text-gray-500 hover:text-gray-300'}`}
          >
            01_LOGIN
            {activeTab === 'login' && <motion.div layoutId="tabLine" className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-cyan shadow-neon-cyan" />}
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={`font-orbitron tracking-wider text-sm pb-2 relative transition-colors ${activeTab === 'register' ? 'text-purple' : 'text-gray-500 hover:text-gray-300'}`}
          >
            02_REGISTER
            {activeTab === 'register' && <motion.div layoutId="tabLine" className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-purple shadow-neon-purple" />}
          </button>
        </div>

        <form onSubmit={handleSystemInit} className="space-y-5">
          <div className="space-y-1 group">
            <label className="text-xs font-mono text-gray-400 group-focus-within:text-cyan transition-colors">Terminal Identity</label>
            <div className="relative">
              <Terminal size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan" />
              <input 
                type="text" 
                defaultValue="admin_core"
                className="w-full bg-black/50 border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan/50 focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] font-mono transition-all"
              />
            </div>
          </div>

          <div className="space-y-1 group">
            <label className="text-xs font-mono text-gray-400 group-focus-within:text-purple transition-colors">Access Cipher</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple" />
              <input 
                type="password" 
                defaultValue="********"
                className="w-full bg-black/50 border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple/50 focus:shadow-[0_0_15px_rgba(124,58,237,0.2)] font-mono transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full mt-6 flex items-center justify-between bg-gradient-to-r from-cyan-400/10 to-purple-500/10 hover:from-cyan-400/20 hover:to-purple-500/20 border border-cyan-400/30 rounded-lg py-3 px-6 text-cyan-400 font-medium tracking-widest transition-all duration-300 group"
          >
            <span>INITIALIZE SYSTEM</span>
            <Zap size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 h-px bg-gray-800"></div>
            <span className="text-xs font-mono text-gray-500">EXTERNAL PROTOCOLS</span>
            <div className="flex-1 h-px bg-gray-800"></div>
          </div>
          <div className="flex space-x-4">
            <button className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 border border-gray-800 rounded bg-white/5 hover:bg-white/10 hover:border-gray-600 transition-all font-inter text-sm text-gray-300">
              <Code size={16} />
              <span>GitHub</span>
            </button>
            <button className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 border border-gray-800 rounded bg-white/5 hover:bg-white/10 hover:border-gray-600 transition-all font-inter text-sm text-gray-300">
              <Globe size={16} />
              <span>Google</span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default LoginPage;
