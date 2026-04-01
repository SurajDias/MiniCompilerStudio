import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Terminal, Cpu, Box, Workflow, Bug, Activity, MonitorPlay, ActivitySquare, LogOut, User } from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { icon: <MonitorPlay size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Terminal size={20} />, label: 'Compiler', path: '/editor' },
    { icon: <Workflow size={20} />, label: 'Pipeline', path: '/pipeline' },
    { icon: <ActivitySquare size={20} />, label: 'Automata', path: '/automata' },
    { icon: <Bug size={20} />, label: 'Debug', path: '/debug' },
    { icon: <Activity size={20} />, label: 'Telemetry', path: '/telemetry' },
    { icon: <Box size={20} />, label: 'Projects', path: '/projects' },
  ];

  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <aside className="w-64 glass-panel border-y-0 border-l-0 border-r-cyan/20 h-full flex flex-col pt-6">
      <div className="px-6 mb-8 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border border-cyan/20 flex items-center justify-center mb-3 bg-[#0a0d16] shadow-sm">
            <Cpu size={24} className="text-cyan/80" />
          </div>
          <p className="text-xs text-gray-400 font-mono tracking-widest">SYS_CORE</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-cyan/10 border border-cyan/10 text-cyan shadow-sm font-medium' 
                  : 'text-gray-400 font-normal hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`
            }
          >
            {React.cloneElement(item.icon, { size: 18, className: 'opacity-80' })}
            <span className="text-sm tracking-wide">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 mt-auto border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center relative">
               <User size={14} className="text-gray-400" />
               <span className="absolute bottom-[-2px] right-[-2px] w-2.5 h-2.5 bg-green-500 border border-[#0B0F1A] rounded-full"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-200">Admin</span>
              <span className="text-[10px] text-gray-500 font-mono">ID: 0x8F9</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors rounded"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
