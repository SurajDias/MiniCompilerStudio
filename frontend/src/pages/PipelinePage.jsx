import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, StepForward, RotateCcw,
  FileCode2, AlignLeft, Target, Settings2, Zap
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
//  Stage definitions  (untouched from original)
// ─────────────────────────────────────────────────────────────
const stages = [
  { id: 'source',    title: 'SOURCE_CODE',       icon: <FileCode2  size={24} />, desc: 'Raw character stream input', color: 'border-gray-500'  },
  { id: 'lexer',     title: 'LEXICAL_ANALYSIS',   icon: <AlignLeft  size={24} />, desc: 'Tokenization',              color: 'border-cyan-400'  },
  { id: 'parser',    title: 'SYNTAX_PARSER',      icon: <Target     size={24} />, desc: 'AST generation',            color: 'border-purple-400'},
  { id: 'tac',       title: 'TAC_GENERATOR',      icon: <Settings2  size={24} />, desc: '3-address code',            color: 'border-pink-500'  },
  { id: 'optimizer', title: 'CODE_OPTIMIZER',     icon: <Zap        size={24} />, desc: 'Optimization',              color: 'border-green-400' },
];

// ─────────────────────────────────────────────────────────────
//  Glow colour for active stage icon  (maps stage → shadow)
// ─────────────────────────────────────────────────────────────
const GLOW = {
  'border-gray-500':   '0 0 18px rgba(107,114,128,0.6)',
  'border-cyan-400':   '0 0 18px rgba(0,229,255,0.55)',
  'border-purple-400': '0 0 18px rgba(168,85,247,0.55)',
  'border-pink-500':   '0 0 18px rgba(236,72,153,0.55)',
  'border-green-400':  '0 0 18px rgba(74,222,128,0.55)',
};

// ─────────────────────────────────────────────────────────────
//  Derive optimization explanations from raw TAC + optimized
//
//  Looks for patterns the optimizer handles and builds a list
//  of human-readable "what happened" strings.
//
//  Examples:
//    TAC:       t1 = 2 * 3          → Constant Folding: 2 * 3 → 6
//    TAC:       t2 = t1 + 0  (t1=6) → Algebraic Simplification: 6 + 0 → 6
// ─────────────────────────────────────────────────────────────
function deriveExplanations(tacLines, optimizedLines) {
  const explanations = [];

  // Build a map of temp → value from optimized output
  const resolved = {};
  for (const line of optimizedLines) {
    const m = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (m) resolved[m[1]] = m[2].trim();
  }

  for (const line of tacLines) {
    // Match:  LHS = A op B
    const m = line.match(/^(\w+)\s*=\s*(\S+)\s*([\+\-\*\/])\s*(\S+)$/);
    if (!m) continue;

    const [, lhs, rawA, op, rawB] = m;

    // Resolve temp vars to their known values for display
    const a = resolved[rawA] ?? rawA;
    const b = resolved[rawB] ?? rawB;

    const aIsNum = !isNaN(Number(a));
    const bIsNum = !isNaN(Number(b));

    if (aIsNum && bIsNum) {
      // Both sides are literals → constant folding happened
      let result;
      const na = Number(a), nb = Number(b);
      if      (op === '+') result = na + nb;
      else if (op === '-') result = na - nb;
      else if (op === '*') result = na * nb;
      else if (op === '/' && nb !== 0) result = Math.floor(na / nb);
      if (result !== undefined) {
        explanations.push(`Constant Folding: ${a} ${op} ${b} → ${result}`);
      }
    } else if ((op === '+' || op === '-') && b === '0') {
      explanations.push(`Algebraic Simplification: ${a} ${op} 0 → ${a}`);
    } else if (op === '*' && b === '1') {
      explanations.push(`Algebraic Simplification: ${a} * 1 → ${a}`);
    } else if (op === '*' && (a === '0' || b === '0')) {
      explanations.push(`Algebraic Simplification: ${a} * ${b} → 0`);
    } else if (op === '/' && b === '1') {
      explanations.push(`Algebraic Simplification: ${a} / 1 → ${a}`);
    }
  }

  // If the optimizer reduced the number of lines, note dead code removal
  const userTac = tacLines.filter(l => {
    const m = l.match(/^(\w+)\s*=/);
    return m && !m[1].startsWith('t');
  });
  if (optimizedLines.length < userTac.length + tacLines.length - userTac.length) {
    const removed = tacLines.filter(l => l.match(/^t\d+\s*=/) &&
      !optimizedLines.some(o => o.includes(l.split('=')[0].trim())));
    if (removed.length > 0) {
      explanations.push(`Dead Code Eliminated: ${removed.length} unused temp(s) removed`);
    }
  }

  return explanations.length > 0
    ? explanations
    : optimizedLines.length > 0
      ? ['No redundancies found — code is already optimal']
      : [];
}

// ─────────────────────────────────────────────────────────────
//  Animated token stream component
//  Tokens fade in one-by-one, 80 ms apart
// ─────────────────────────────────────────────────────────────
const TokenStream = ({ tokens }) => {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setVisible(0);
    if (!tokens.length) return;
    const id = setInterval(() => {
      setVisible(prev => {
        if (prev >= tokens.length) { clearInterval(id); return prev; }
        return prev + 1;
      });
    }, 80);
    return () => clearInterval(id);
  }, [tokens]);

  return (
    <div className="flex flex-col gap-[2px]">
      {tokens.slice(0, visible).map((tok, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
          className="text-cyan-300"
        >
          {tok}
        </motion.span>
      ))}
      {/* blinking cursor while more tokens remain */}
      {visible < tokens.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="text-cyan-400"
        >▋</motion.span>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  Staged text reveal (for AST / TAC — line-by-line)
// ─────────────────────────────────────────────────────────────
const StagedText = ({ lines, color = 'text-gray-200', delayMs = 120 }) => {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setVisible(0);
    if (!lines.length) return;
    const id = setInterval(() => {
      setVisible(prev => {
        if (prev >= lines.length) { clearInterval(id); return prev; }
        return prev + 1;
      });
    }, delayMs);
    return () => clearInterval(id);
  }, [lines, delayMs]);

  return (
    <div className="flex flex-col gap-[2px]">
      {lines.slice(0, visible).map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`${color} whitespace-pre-wrap`}
        >
          {line}
        </motion.div>
      ))}
      {visible < lines.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="text-gray-400"
        >▋</motion.span>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  Optimization explanation panel
//  Each line pops in with a slight delay
// ─────────────────────────────────────────────────────────────
const OptExplanations = ({ explanations, finalLines }) => (
  <div className="flex flex-col gap-2">
    {/* Explanation badges */}
    {explanations.map((exp, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.18, duration: 0.25 }}
        className="text-yellow-300 text-[11px] font-mono bg-yellow-400/5 border border-yellow-400/20 px-2 py-1 rounded"
      >
        ⚡ {exp}
      </motion.div>
    ))}

    {/* Final optimized output */}
    {finalLines.length > 0 && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: explanations.length * 0.18 + 0.1 }}
        className="mt-2 border-t border-gray-700 pt-2"
      >
        <div className="text-gray-500 text-[10px] mb-1 font-mono tracking-widest">RESULT</div>
        <StagedText lines={finalLines} color="text-green-400" delayMs={150} />
      </motion.div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────
//  "Processing..." pulse badge shown before output is ready
// ─────────────────────────────────────────────────────────────
const ProcessingBadge = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: [0.4, 1, 0.4] }}
    transition={{ duration: 1, repeat: Infinity }}
    className="text-cyan-400 text-xs font-mono flex items-center gap-2"
  >
    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-pulse" />
    Processing...
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const PipelinePage = () => {

  const [activeStep, setActiveStep] = useState(-1);
  const [isPlaying,  setIsPlaying]  = useState(false);

  const [code,      setCode]      = useState('');
  const [tokens,    setTokens]    = useState([]);
  const [syntax,    setSyntax]    = useState('');
  const [tac,       setTac]       = useState([]);
  const [optimized, setOptimized] = useState([]);

  // true while waiting for backend response for a given step
  const [processing, setProcessing] = useState(false);
  // which step has data loaded (avoids showing stale data)
  const [loadedStep, setLoadedStep] = useState(-1);

  // ── Load code from localStorage (untouched logic) ──
  useEffect(() => {
    const loadCode = () => {
      const stored = localStorage.getItem('pipeline_code');
      if (stored) setCode(stored);
    };
    loadCode();
    window.addEventListener('pipeline-update', loadCode);
    return () => window.removeEventListener('pipeline-update', loadCode);
  }, []);

  // ── Fetch pipeline from backend (untouched logic) ──
  const fetchPipeline = async () => {
    setProcessing(true);
    try {
      const res  = await fetch('http://127.0.0.1:5000/compile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code }),
      });
      const data = await res.json();
      setTokens(data.tokens    || []);
      setSyntax(data.syntax    || '');
      setTac(data.tac          || []);
      setOptimized(data.optimized || []);
      setLoadedStep(0);   // mark data as fresh
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  // ── Animation loop: advance one step every 1 500 ms ──
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setActiveStep(prev => {
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

  // ── Controls (untouched logic) ──
  const handlePlayPause = () => {
    if (!isPlaying) fetchPipeline();
    if (activeStep >= stages.length - 1) setActiveStep(-1);
    setIsPlaying(!isPlaying);
  };
  const handleStep = () => {
    setIsPlaying(false);
    if (activeStep === -1) fetchPipeline();
    if (activeStep < stages.length - 1) setActiveStep(activeStep + 1);
  };
  const handleReset = () => {
    setIsPlaying(false);
    setActiveStep(-1);
    setLoadedStep(-1);
    setProcessing(false);
  };

  // ── Build output for each stage ──
  const getStageContent = (id, index) => {
    // Show "Processing..." if backend hasn't responded yet
    const isCurrentAndLoading = index === activeStep && processing;
    if (isCurrentAndLoading) return <ProcessingBadge />;

    switch (id) {

      case 'source':
        // Plain source code — split into lines for staged reveal
        return <StagedText lines={code.split('\n')} color="text-gray-300" delayMs={80} />;

      case 'lexer':
        // Tokens appear one-by-one
        return tokens.length
          ? <TokenStream tokens={tokens} />
          : <ProcessingBadge />;

      case 'parser':
        // AST / syntax string — split by newline for staged reveal
        return syntax
          ? <StagedText
              lines={syntax.split('\n')}
              color={syntax.includes('Error') ? 'text-red-400' : 'text-purple-300'}
              delayMs={100}
            />
          : <ProcessingBadge />;

      case 'tac':
        return tac.length
          ? <StagedText lines={tac} color="text-pink-300" delayMs={130} />
          : <ProcessingBadge />;

      case 'optimizer':
        if (!optimized.length && !tac.length) return <ProcessingBadge />;
        // Build human-readable explanations then show final output
        const explanations = deriveExplanations(tac, optimized);
        return <OptExplanations explanations={explanations} finalLines={optimized} />;

      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────
  //  JSX  —  layout/structure identical to original.
  //  Changes: added pulsing glow on active icon, AnimatePresence
  //  on output panels, replaced raw text dump with rich components.
  // ─────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col items-center p-6 relative z-10">

      {/* ── Header (untouched) ── */}
      <div className="w-full max-w-4xl bg-black/40 border border-gray-800 rounded-xl p-6 mb-12 flex items-center justify-between">
        <div>
          <h2 className="font-orbitron text-xl tracking-widest text-cyan-400">COMPILATION_PIPELINE</h2>
          <p className="text-gray-400 text-sm mt-1">Real-time execution sequence monitoring</p>
        </div>

        <div className="flex space-x-4">
          <button onClick={handlePlayPause} className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-cyan-400 hover:border-cyan-400 transition-colors">
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={handleStep} className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-purple-400 hover:border-purple-400 transition-colors">
            <StepForward size={18} />
          </button>
          <button onClick={handleReset} className="w-12 h-12 rounded-full border border-gray-600 flex items-center justify-center text-gray-400 hover:border-gray-400 transition-colors">
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {/* ── Pipeline stages ── */}
      <div className="flex-1 w-full max-w-2xl flex flex-col items-center relative">

        {/* Background track (untouched) */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-gray-800" />

        {/* Animated fill line (untouched) */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-cyan-400 via-purple-400 to-green-400"
          initial={{ height: 0 }}
          animate={{ height: activeStep >= 0 ? `${(activeStep / (stages.length - 1)) * 100}%` : '0%' }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />

        {stages.map((stage, index) => {
          const isActive = index === activeStep;
          const isPassed = index < activeStep;

          return (
            <div key={stage.id} className="relative w-full flex justify-center items-center my-6">

              {/* ── Stage icon ──
                  ADDED: pulsing glow ring when active,
                         scale-up on active/passed via motion */}
              <motion.div
                animate={isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={isActive ? { duration: 1, repeat: Infinity } : {}}
                style={{ boxShadow: isActive ? GLOW[stage.color] : 'none' }}
                className={`relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center bg-[#0B0F1A] border-2 transition-colors duration-500 ${
                  isActive || isPassed ? stage.color : 'border-gray-800'
                }`}
              >
                {/* Icon colour: active/passed = bright, else dim */}
                <span className={`transition-colors duration-300 ${
                  isActive  ? 'text-white' :
                  isPassed  ? 'text-gray-300' :
                              'text-gray-600'
                }`}>
                  {stage.icon}
                </span>

                {/* Green check on completed stages */}
                {isPassed && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white font-bold"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.div>

              {/* ── Output panel ──
                  ADDED: AnimatePresence so panel slides in smoothly;
                         each stage renders its own rich component */}
              <div className={`absolute top-1/2 -translate-y-1/2 w-[calc(50%-3rem)] ${
                index % 2 === 0 ? 'right-0 pl-12' : 'left-0 pr-12'
              }`}>

                {/* Stage title */}
                <h3 className={`text-sm font-mono tracking-wide transition-colors duration-300 ${
                  isActive  ? 'text-white' :
                  isPassed  ? 'text-gray-400' :
                              'text-gray-600'
                }`}>
                  {stage.title}
                </h3>

                {/* Sub-description */}
                <p className="text-[10px] text-gray-600 mt-0.5">{stage.desc}</p>

                {/* Output panel — only shown for active/passed stages */}
                <AnimatePresence>
                  {(isActive || isPassed) && (
                    <motion.div
                      key={`${stage.id}-panel`}
                      initial={{ opacity: 0, y: 8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className={`mt-3 p-3 text-xs font-mono rounded border bg-black/60 overflow-auto max-h-44 ${
                        isActive ? 'border-cyan-400/60' : 'border-gray-700/40'
                      }`}
                    >
                      {getStageContent(stage.id, index)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelinePage;