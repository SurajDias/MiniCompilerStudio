import React from 'react';
import { FolderGit2, Clock, CheckCircle2, ChevronRight, Settings, Trash2, PlusCircle, LayoutGrid } from 'lucide-react';

const mockProjects = [
  { id: 1, name: 'Neural_Net_DSL', lastOpened: '2 mins ago', status: 'STABLE', type: 'Custom', files: 12 },
  { id: 2, name: 'Quantum_Parser_Beta', lastOpened: '1 hour ago', status: 'IN_PROGRESS', type: 'Experimental', files: 4 },
  { id: 3, name: 'C++_Subset_Compiler', lastOpened: '2 days ago', status: 'FAILED_BUILD', type: 'Standard', files: 8 },
  { id: 4, name: 'WebAssembly_CodeGen', lastOpened: '5 days ago', status: 'STABLE', type: 'Target', files: 3 },
  { id: 5, name: 'Regex_Engine_V2', lastOpened: '1 week ago', status: 'STABLE', type: 'Module', files: 2 },
  { id: 6, name: 'Lexical_Analyzer_Test', lastOpened: '2 weeks ago', status: 'ARCHIVED', type: 'Test', files: 1 },
];

const ProjectsPage = () => {
  return (
    <div className="h-full w-full flex flex-col z-10 relative flex-1 p-2 py-4 px-6 overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-orbitron font-medium text-xl tracking-widest text-cyan-400 flex items-center">
            <LayoutGrid className="mr-3 text-cyan-500/80" size={24} />
            PROJECT_WORKSPACE
          </h2>
          <p className="text-gray-400 font-inter text-sm mt-1">Manage compiler configurations and source files</p>
        </div>
        <button className="flex items-center space-x-2 px-6 py-2.5 bg-cyan-400/10 border border-cyan-400/20 hover:bg-cyan-400/20 hover:border-cyan-400/40 text-cyan-400 rounded-lg transition-all font-mono tracking-widest text-sm shadow-sm group">
          <PlusCircle size={16} className="group-hover:scale-110 transition-transform" />
          <span>NEW_PROJECT</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProjects.map((project) => (
          <div 
            key={project.id} 
            className={`bg-[#0E121C] p-6 rounded-xl border flex flex-col group transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-lg ${
              project.status === 'FAILED_BUILD' ? 'border-red-500/20 hover:border-red-500/40' : 
              project.status === 'STABLE' ? 'border-gray-800 hover:border-cyan-400/40' : 
              'border-gray-800 hover:border-gray-600'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                  project.status === 'STABLE' ? 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400' : 
                  project.status === 'FAILED_BUILD' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 
                  'bg-gray-800/50 border-gray-700 text-gray-400'
                }`}>
                  <FolderGit2 size={20} />
                </div>
              </div>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded"><Settings size={14} /></button>
                <button className="text-gray-500 hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/10 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
            
            <h3 className="font-orbitron font-medium text-lg text-gray-100 mb-2 tracking-wide group-hover:text-white transition-colors">{project.name}</h3>
            
            <div className="flex items-center text-xs font-inter text-gray-500 mb-6">
               <Clock size={12} className="mr-1" /> Last modified {project.lastOpened}
            </div>
            
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-800/80">
               <div className="flex items-center">
                 {project.status === 'STABLE' && <span className="flex items-center text-green-400 text-xs font-mono bg-green-500/10 px-2 py-1 rounded"><CheckCircle2 size={12} className="mr-1.5" /> {project.status}</span>}
                 {project.status === 'FAILED_BUILD' && <span className="flex items-center text-red-400 text-xs font-mono bg-red-500/10 px-2 py-1 rounded"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></span> {project.status}</span>}
                 {project.status === 'IN_PROGRESS' && <span className="flex items-center text-cyan-400 text-xs font-mono bg-cyan-400/10 px-2 py-1 rounded"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1.5 animate-pulse"></span> {project.status}</span>}
                 {project.status === 'ARCHIVED' && <span className="text-gray-500 text-xs font-mono bg-gray-800 px-2 py-1 rounded">{project.status}</span>}
               </div>
               <button className="text-cyan-400 text-xs font-mono tracking-widest flex items-center group-hover:text-cyan-300 transition-colors opacity-80 group-hover:opacity-100">
                 OPEN <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default ProjectsPage;
