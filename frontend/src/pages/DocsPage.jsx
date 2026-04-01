import React from 'react';
import { BookOpen, FastForward, Cpu, Code2, Network } from 'lucide-react';

const DocsPage = () => {
  return (
    <div className="h-full w-full flex flex-col z-10 relative overflow-y-auto px-4 max-w-5xl mx-auto pb-20 custom-scrollbar">
      
      {/* Header */}
      <div className="flex items-center justify-center mb-12 mt-4 flex-col text-center">
        <div className="w-16 h-16 rounded-full glass-panel border-purple/50 flex items-center justify-center mb-4 text-purple shadow-neon-purple animate-glow-pulse">
           <BookOpen size={32} />
        </div>
        <h2 className="font-orbitron font-bold text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan to-purple text-glow-cyan">SYSTEM_DOCUMENTATION</h2>
        <p className="text-gray-400 font-mono text-sm mt-2">Theory and Operation Manual v2.0</p>
      </div>

      <div className="space-y-12">
        {/* Section 1: Compiler Stages */}
        <section className="glass-panel p-8 rounded-2xl border-cyan/20">
          <h3 className="flex items-center text-xl font-orbitron tracking-widest text-cyan mb-6 border-b border-cyan/20 pb-4">
             <FastForward className="mr-3" /> THE COMPILATION PIPELINE
          </h3>
          
          <div className="space-y-6 text-gray-300 font-inter leading-relaxed">
             <p>A compiler translates source code written in a high-level language into machine code. Our simulated pipeline breaks this into 5 distinct phases:</p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/40 p-4 rounded border border-gray-800 hover:border-cyan/30 transition-colors">
                  <h4 className="text-cyan font-mono text-sm mb-2 font-bold flex items-center"><span className="text-xs border border-cyan px-1 rounded mr-2">1</span> Lexical Analysis</h4>
                  <p className="text-sm text-gray-400">Converts the raw character stream into meaningful tokens (keywords, identifiers, symbols). It uses Finite Automata for pattern matching.</p>
                </div>
                <div className="bg-black/40 p-4 rounded border border-gray-800 hover:border-purple/30 transition-colors">
                  <h4 className="text-purple font-mono text-sm mb-2 font-bold flex items-center"><span className="text-xs border border-purple px-1 rounded mr-2">2</span> Syntax Analysis</h4>
                  <p className="text-sm text-gray-400">Takes the token sequence and builds an Abstract Syntax Tree (AST) verifying the grammatical structure using Context-Free Grammars.</p>
                </div>
                <div className="bg-black/40 p-4 rounded border border-gray-800 hover:border-green-400/30 transition-colors">
                  <h4 className="text-green-400 font-mono text-sm mb-2 font-bold flex items-center"><span className="text-xs border border-green-500 px-1 rounded mr-2">3</span> Semantic Analysis</h4>
                  <p className="text-sm text-gray-400">Verifies semantic consistency, such as type checking and ensuring variables are declared before use.</p>
                </div>
                <div className="bg-black/40 p-4 rounded border border-gray-800 hover:border-pink-500/30 transition-colors">
                  <h4 className="text-pink-500 font-mono text-sm mb-2 font-bold flex items-center"><span className="text-xs border border-pink-500 px-1 rounded mr-2">4</span> Code Generation (TAC)</h4>
                  <p className="text-sm text-gray-400">Generates platform-independent Three-Address Code, breaking down complex expressions into simple atomic instructions.</p>
                </div>
                <div className="bg-black/40 p-4 rounded border border-gray-800 hover:border-yellow-400/30 transition-colors md:col-span-2">
                  <h4 className="text-yellow-400 font-mono text-sm mb-2 font-bold flex items-center"><span className="text-xs border border-yellow-400 px-1 rounded mr-2">5</span> Code Optimization & Target Gen</h4>
                  <p className="text-sm text-gray-400">Applies transformations (like dead code elimination) to improve execution speed and generates the final assembly instructions.</p>
                </div>
             </div>
          </div>
        </section>

        {/* Section 2: Automata Theory */}
        <section className="glass-panel-purple p-8 rounded-2xl border-purple/20">
          <h3 className="flex items-center text-xl font-orbitron tracking-widest text-purple mb-6 border-b border-purple/20 pb-4">
             <Network className="mr-3" /> AUTOMATA THEORY (NFA & DFA)
          </h3>
          
          <div className="space-y-6 text-gray-300 font-inter leading-relaxed">
             <p>Regular expressions are implemented in lexers by constructing state machines. <strong>Finite Automata</strong> are abstract machines that can be in exactly one of a finite number of states at any given time.</p>
             
             <div className="flex flex-col md:flex-row gap-6 mt-4">
                <div className="flex-1 bg-[#100b1a] p-5 rounded-lg border border-purple/30 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-purple"></div>
                   <h4 className="font-orbitron text-white tracking-widest mb-3">NFA (Nondeterministic)</h4>
                   <ul className="list-disc list-inside text-sm text-gray-400 space-y-2 marker:text-purple">
                     <li>Can transit to multiple states for a single input symbol.</li>
                     <li>Allows empty (ε) transitions without consuming input.</li>
                     <li>Easier to build directly from a Regular Expression.</li>
                     <li>Slower to execute because we must simulate multiple paths.</li>
                   </ul>
                </div>

                <div className="flex items-center justify-center text-purple hidden md:flex">
                   <FastForward size={24} />
                </div>

                <div className="flex-1 bg-[#0a151f] p-5 rounded-lg border border-cyan/30 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-cyan"></div>
                   <h4 className="font-orbitron text-white tracking-widest mb-3">DFA (Deterministic)</h4>
                   <ul className="list-disc list-inside text-sm text-gray-400 space-y-2 marker:text-cyan">
                     <li>Exactly one transition per state for each input symbol.</li>
                     <li>No empty (ε) transitions allowed.</li>
                     <li>Created from NFA using the Subset Construction algorithm.</li>
                     <li>Extremely fast to execute (O(N) time where N is input length).</li>
                   </ul>
                </div>
             </div>
             
             <div className="mt-6 p-4 border border-gray-700 rounded bg-black/50 text-sm italic text-gray-400 text-center">
                Use the <strong>Automata Core</strong> module in this OS to visualize the conversion of Regex to NFA to DFA.
             </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default DocsPage;
