import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Code2, Network, Cpu,
  ShieldAlert, Cpu as Microchip,
  Terminal, Bug
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const LS_LATEST = "telemetry_latest";

const DashboardPage = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    tokens: 0,
    latency: 0,
    errors: 0,
    optimized: 0
  });

  // 📊 Load stats
  const loadStats = () => {
    try {
      const latest = JSON.parse(localStorage.getItem(LS_LATEST));
      if (!latest) return;

      setStats({
        tokens: latest.tokens?.length || 0,
        latency: latest.latency || 0,
        errors: latest.syntax?.includes("Error") ? 1 : 0,
        optimized: latest.optimized?.length || 0
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStats();
    window.addEventListener('telemetry-updated', loadStats);

    // ✅ CHATBASE (ONLY LOAD ONCE)
    if (!document.getElementById("chatbase-script")) {
      const script = document.createElement("script");
      script.src = "https://www.chatbase.co/embed.min.js";

      // 👉 USE ONLY ONE ID (your correct one)
      script.id = "chatbase-script";
      script.setAttribute("chatbotId", "DQAFyy62OiKpuxSSwHqUh"); // ✅ your bot id
      script.setAttribute("domain", "www.chatbase.co");

      document.body.appendChild(script);
    }

    return () => {
      window.removeEventListener('telemetry-updated', loadStats);
    };
  }, []);

  const statData = [
    { icon: <Terminal />, title: "Tokens Parsed", value: stats.tokens },
    { icon: <Cpu />, title: "Compile Time", value: `${stats.latency} ms` },
    { icon: <Bug />, title: "Errors", value: stats.errors },
    { icon: <Activity />, title: "Optimized Lines", value: stats.optimized }
  ];

  const modules = [
    { title: "Automata Core", icon: <Network size={24} />, path: "/automata" },
    { title: "Pipeline Execution", icon: <Microchip size={24} />, path: "/pipeline" },
    { title: "Debug Assistant", icon: <ShieldAlert size={24} />, path: "/debug" }
  ];

  return (
    <div className="h-full w-full flex flex-col pt-10 pb-20 px-6 md:px-12 overflow-y-auto">

      {/* 🔥 HERO */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
        <h1 className="text-4xl font-orbitron bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-3">
          MINI COMPILER STUDIO
        </h1>

        <div className="flex gap-4">
          <Link to="/editor" className="px-5 py-2 border border-cyan-400 text-cyan-400 rounded">
            Start
          </Link>
          <Link to="/telemetry" className="px-5 py-2 border border-gray-600 text-gray-300 rounded">
            Telemetry
          </Link>
        </div>
      </motion.div>

      {/* 🔥 STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statData.map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            className="p-5 rounded-xl bg-[#10141d] border border-gray-800 flex justify-between"
          >
            <div>
              <p className="text-gray-500 text-xs">{stat.title}</p>
              <h3 className="text-2xl text-white">{stat.value}</h3>
            </div>
            <div className="text-cyan-400">{stat.icon}</div>
          </motion.div>
        ))}
      </div>

      {/* 🔥 MODULES */}
      <div>
        <h2 className="text-lg text-gray-200 mb-6 flex items-center">
          <Code2 size={20} className="mr-2 text-purple-400" />
          ACTIVE MODULES
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((m, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate(m.path)}
              className="p-6 bg-[#0E121C] border border-gray-800 rounded-xl cursor-pointer"
            >
              <div className="mb-4 text-purple-400">{m.icon}</div>
              <h3 className="text-white">{m.title}</h3>
              <p className="text-gray-400 text-sm">
                Click to explore module
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 🤖 Helper Text */}
    

    </div>
  );
};

export default DashboardPage;