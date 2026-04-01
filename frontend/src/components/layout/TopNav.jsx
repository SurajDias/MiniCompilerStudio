import React from 'react';
import { Search, Bell, Settings, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const TopNav = () => {
  return (
    <header className="h-16 glass-panel border-x-0 border-t-0 border-b-cyan/20 flex items-center justify-between px-6 z-10 relative">
      <div className="flex items-center space-x-4">
        <h1 className="font-orbitron font-medium text-lg tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          MINI_COMPILER<span className="text-white ml-2">STUDIO</span>
        </h1>
      </div>
      
      <div className="flex items-center space-x-6">
        <div className="relative group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan group-focus-within:text-glow-cyan" />
          <input 
            type="text" 
            placeholder="Search telemetry..." 
            className="bg-black/40 border border-cyan/20 rounded-full py-1.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-cyan/50 focus:shadow-[0_0_10px_rgba(0,229,255,0.3)] transition-all w-64"
          />
        </div>
        
        <div className="flex items-center space-x-4 text-gray-400">
          <button className="hover:text-cyan transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-purple rounded-full"></span>
          </button>
          <Link to="/docs" className="hover:text-cyan transition-colors">
            <HelpCircle size={18} />
          </Link>
          <button className="hover:text-cyan transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
