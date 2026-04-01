import React from 'react';
import { motion } from 'framer-motion';
import { Play, Activity, Code2, Network, Cpu, ShieldAlert, Cpu as Microchip, Terminal, Bug } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const navigate = useNavigate();
  
  const modules = [
    { title: "Automata Core", desc: "Visualize Regular Expressions transformations into NFA and highly optimized DFA states.", icon: <Network size={24} />, path: "/automata", color: "cyan-400", status: "Active" },
    { title: "Pipeline Execution", desc: "Observe the step-by-step lexical, syntax, and semantic analysis flow in real-time.", icon: <Microchip size={24} />, path: "/pipeline", color: "purple-500", status: "Ready" },
    { title: "Debug Assistant", desc: "AI-powered syntax error detection and automatic resolution suggestions.", icon: <ShieldAlert size={24} />, path: "/debug", color: "gray-400", status: "Online" }
  ];

  return (
    <div className="h-full w-full flex flex-col pt-10 pb-20 px-6 md:px-12 overflow-y-auto">
      
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center px-3 py-1 bg-cyan-400/10 border border-cyan-400/20 rounded text-cyan-400 text-xs font-mono mb-4">
            <Activity className="w-3 h-3 mr-2 animate-pulse" />
            System Live
          </div>
          <h1 className="text-4xl md:text-5xl font-orbitron font-medium tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
            MINI_COMPILER<span className="text-white ml-2">STUDIO</span>
          </h1>
          <p className="text-gray-400 font-inter text-md max-w-xl mb-6">
            A comprehensive visualization environment for compiler theory. 
            Write, compile, and debug custom syntax.
          </p>

          <div className="flex space-x-4">
            <Link 
              to="/editor" 
              className="group flex items-center px-6 py-3 bg-gradient-to-r from-cyan-400/10 to-purple-500/10 border border-cyan-400/30 rounded-lg text-cyan-400 font-medium tracking-wide hover:from-cyan-400/20 hover:to-purple-500/20 transition-all duration-300 shadow-sm"
            >
              <Play size={18} className="mr-3" />
              <span>Start Simulation</span>
            </Link>
            
            <Link 
              to="/telemetry" 
              className="group flex items-center px-6 py-3 border border-gray-700 rounded-lg text-gray-300 font-medium tracking-wide hover:border-gray-500 hover:text-white transition-all duration-300 bg-black/20"
            >
              <Activity size={18} className="mr-3" />
              <span>View Telemetry</span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 mt-4">
        {[ {icon: <Terminal/>, title: "Tokens Parsed", value: "24,892", trend: "+12%"},
           {icon: <Cpu/>, title: "Compile Time", value: "45ms", trend: "-5ms"},
           {icon: <Bug/>, title: "Known Errors", value: "0", trend: "Stable"},
           {icon: <Activity/>, title: "Memory Load", value: "42%", trend: "Normal"}
         ].map((stat, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
            className="p-5 rounded-xl bg-[#10141d] border border-gray-800 hover:border-gray-700 transition-colors flex items-center justify-between group cursor-default"
          >
            <div>
              <p className="text-gray-500 text-xs font-mono mb-1">{stat.title}</p>
              <h3 className="text-2xl font-semibold text-white group-hover:text-cyan-400 transition-colors">{stat.value}</h3>
              <p className="text-xs text-gray-500 mt-1">{stat.trend}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-cyan-400/5 text-cyan-400 flex items-center justify-center">
              {React.cloneElement(stat.icon, { size: 20 })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modules List */}
      <div>
        <h2 className="text-lg font-orbitron text-gray-200 mb-6 drop-shadow-sm flex items-center">
          <Code2 size={20} className="mr-2 text-purple-400" /> ACTIVE MODULES
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((module, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + (i * 0.1) }}
              onClick={() => navigate(module.path)}
              className={`p-6 bg-[#0E121C] border border-gray-800 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-${module.color.split('-')[0]}/30 hover:shadow-lg`}
            >
              <div className={`w-12 h-12 rounded bg-${module.color.split('-')[0]}/10 text-${module.color} flex items-center justify-center mb-4`}>
                {module.icon}
              </div>
              <h3 className={`text-lg font-medium tracking-wide text-white mb-2`}>{module.title}</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">{module.desc}</p>
              <div className="flex items-center text-xs font-mono text-gray-500">
                 <span className={`w-1.5 h-1.5 rounded-full bg-${module.color.split('-')[0]} mr-2`}></span>
                 {module.status}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
