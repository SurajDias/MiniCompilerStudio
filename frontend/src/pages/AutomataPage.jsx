import React, { useState, useMemo, useCallback, useRef } from 'react';
import ReactFlow, {
  Controls, Background,
  useNodesState, useEdgesState,
  MarkerType, Handle, Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Settings, Bell, HelpCircle, Play, RotateCcw, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── SELF LOOP EDGE ───────────────────────────────────────────────────────────
const SelfLoopEdge = ({ id, sourceX, sourceY, label, style, markerEnd }) => {
  const spread = 40, lift = 70;
  const d = [
    `M ${sourceX - 8},${sourceY - 10}`,
    `C ${sourceX - spread},${sourceY - lift}`,
    `  ${sourceX + spread},${sourceY - lift}`,
    `  ${sourceX + 8},${sourceY - 10}`,
  ].join(' ');
  return (
    <g>
      <path id={id} d={d} fill="none" style={style} markerEnd={markerEnd} />
      {label && (
        <>
          <rect x={sourceX - 12} y={sourceY - lift - 17} width={24} height={16} rx={3} fill="#0a0d16" fillOpacity={0.9} />
          <text x={sourceX} y={sourceY - lift - 4} textAnchor="middle" dominantBaseline="middle" fill="#e2e8f0" fontSize={11} fontFamily="monospace">{label}</text>
        </>
      )}
    </g>
  );
};

// ─── STATE NODE ───────────────────────────────────────────────────────────────
const StateNode = ({ data, isConnectable }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { label, nodeType, delay, simState } = data;

  let borderStyle = 'border-[#374151]';
  let glowStyle   = 'shadow-none';
  let innerClasses = '';
  let bgStyle = 'bg-[#0a0d16]';

  if (simState === 'current') {
    borderStyle = 'border-yellow-300';
    glowStyle   = 'shadow-[0_0_24px_6px_rgba(253,224,71,0.7)]';
    bgStyle     = 'bg-yellow-900/30';
  } else if (simState === 'visited') {
    borderStyle = 'border-cyan-300';
    glowStyle   = 'shadow-[0_0_12px_rgba(34,211,238,0.5)]';
    bgStyle     = 'bg-cyan-900/20';
  } else if (nodeType === 'start') {
    borderStyle = 'border-cyan-400';
    glowStyle   = isHovered ? 'shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'shadow-[0_0_8px_rgba(0,229,255,0.2)]';
  } else if (nodeType === 'accept') {
    borderStyle  = 'border-purple-400';
    glowStyle    = isHovered ? 'shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'shadow-[0_0_8px_rgba(168,85,247,0.2)]';
    innerClasses = 'ring-2 ring-purple-400/50 ring-inset';
  } else if (nodeType === 'dead') {
    borderStyle = 'border-red-900';
  } else {
    borderStyle = isHovered ? 'border-gray-400' : 'border-[#374151]';
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay || 0, duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex justify-center items-center"
    >
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="opacity-0" />
      {nodeType === 'start' && (
        <div className="absolute -top-5 text-[10px] font-mono text-cyan-400 tracking-widest font-semibold">START</div>
      )}
      <div className={`w-[50px] h-[50px] rounded-full ${bgStyle} flex items-center justify-center font-mono border-2 ${borderStyle} ${glowStyle} ${innerClasses} transition-all duration-300`}>
        {label}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="opacity-0" />
    </motion.div>
  );
};

// ─── REGEX → NFA ──────────────────────────────────────────────────────────────
const tokenizeRegex = (r) => {
  const ops = ['*','|','(',')','+','?'];
  return r.split('').map(c => ({ type: ops.includes(c) ? 'operator' : 'literal', value: c }));
};
const insertConcatOps = (tokens) => {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    out.push(tokens[i]);
    if (i + 1 < tokens.length) {
      const cur = tokens[i], next = tokens[i+1];
      const curEnds    = cur.type === 'literal'  || [')',  '*', '+', '?'].includes(cur.value);
      const nextStarts = next.type === 'literal' || next.value === '(';
      if (curEnds && nextStarts) out.push({ type: 'concat', value: '.' });
    }
  }
  return out;
};
const PREC = { '|': 1, '.': 2, '*': 3, '+': 3, '?': 3 };
const toPostfix = (tokens) => {
  const out = [], ops = [];
  for (const tok of tokens) {
    if (tok.type === 'literal') { out.push(tok); }
    else if (tok.value === '(') { ops.push(tok); }
    else if (tok.value === ')') {
      while (ops.length && ops[ops.length-1].value !== '(') out.push(ops.pop());
      ops.pop();
    } else {
      while (ops.length && ops[ops.length-1].value !== '(' && (PREC[ops[ops.length-1].value]||0) >= (PREC[tok.value]||0)) out.push(ops.pop());
      ops.push(tok);
    }
  }
  while (ops.length) out.push(ops.pop());
  return out;
};
let _sid = 0;
const fs = () => `q${_sid++}`;
const buildNFA = (postfix) => {
  _sid = 0;
  const stack = [];
  for (const tok of postfix) {
    if (tok.type === 'literal') {
      const [s0,s1] = [fs(),fs()];
      stack.push({ start:s0, accept:s1, states:[s0,s1], transitions:[{from:s0,to:s1,label:tok.value}] });
    } else if (tok.value === '.') {
      const B=stack.pop(), A=stack.pop();
      stack.push({ start:A.start, accept:B.accept, states:[...A.states,...B.states], transitions:[...A.transitions,{from:A.accept,to:B.start,label:'ε'},...B.transitions] });
    } else if (tok.value === '|') {
      const B=stack.pop(), A=stack.pop(), [s,e]=[fs(),fs()];
      stack.push({ start:s, accept:e, states:[s,...A.states,...B.states,e], transitions:[{from:s,to:A.start,label:'ε'},{from:s,to:B.start,label:'ε'},...A.transitions,...B.transitions,{from:A.accept,to:e,label:'ε'},{from:B.accept,to:e,label:'ε'}] });
    } else if (tok.value === '*') {
      const A=stack.pop(), [s,e]=[fs(),fs()];
      stack.push({ start:s, accept:e, states:[s,...A.states,e], transitions:[{from:s,to:A.start,label:'ε'},{from:s,to:e,label:'ε'},...A.transitions,{from:A.accept,to:A.start,label:'ε'},{from:A.accept,to:e,label:'ε'}] });
    } else if (tok.value === '+') {
      const A=stack.pop(), [s,e]=[fs(),fs()];
      stack.push({ start:s, accept:e, states:[s,...A.states,e], transitions:[{from:s,to:A.start,label:'ε'},...A.transitions,{from:A.accept,to:A.start,label:'ε'},{from:A.accept,to:e,label:'ε'}] });
    } else if (tok.value === '?') {
      const A=stack.pop(), [s,e]=[fs(),fs()];
      stack.push({ start:s, accept:e, states:[s,...A.states,e], transitions:[{from:s,to:A.start,label:'ε'},{from:s,to:e,label:'ε'},...A.transitions,{from:A.accept,to:e,label:'ε'}] });
    }
  }
  return stack[0] || null;
};

// ─── NFA → DFA → MINIMIZE ────────────────────────────────────────────────────
const epsilonClosure = (stateSet, transitions) => {
  const closure = new Set(stateSet), stack = [...stateSet];
  while (stack.length) {
    const cur = stack.pop();
    for (const t of transitions) {
      if (t.from === cur && t.label === 'ε' && !closure.has(t.to)) { closure.add(t.to); stack.push(t.to); }
    }
  }
  return [...closure].sort();
};
const moveOn = (stateSet, symbol, transitions) =>
  [...new Set(transitions.filter(t => stateSet.includes(t.from) && t.label === symbol).map(t => t.to))];
const getAlphabet = (transitions) => [...new Set(transitions.map(t => t.label).filter(l => l !== 'ε'))].sort();
const DEAD_STATE = 'DEAD';

const subsetConstruct = (nfa) => {
  const { transitions, start: nfaStart, accept: nfaAccept } = nfa;
  const alpha = getAlphabet(transitions);
  const keyToId = new Map(), labelMap = new Map();
  let counter = 0, needsDead = false;
  const getOrCreate = (nfaSet) => {
    const key = nfaSet.join(',');
    if (!keyToId.has(key)) { const id = `D${counter++}`; keyToId.set(key, id); labelMap.set(id, nfaSet); }
    return keyToId.get(key);
  };
  const startSet = epsilonClosure([nfaStart], transitions);
  const startId  = getOrCreate(startSet);
  const dfaTransitions = [], processed = new Set(), worklist = [startSet];
  while (worklist.length) {
    const cur = worklist.shift(), curId = getOrCreate(cur);
    if (processed.has(curId)) continue;
    processed.add(curId);
    for (const sym of alpha) {
      const moved = moveOn(cur, sym, transitions);
      if (!moved.length) { dfaTransitions.push({ from:curId, to:DEAD_STATE, label:sym }); needsDead = true; }
      else {
        const closure = epsilonClosure(moved, transitions), nextId = getOrCreate(closure);
        dfaTransitions.push({ from:curId, to:nextId, label:sym });
        if (!processed.has(nextId)) worklist.push(closure);
      }
    }
  }
  const allIds = [...keyToId.values()];
  if (needsDead) { for (const sym of alpha) dfaTransitions.push({ from:DEAD_STATE, to:DEAD_STATE, label:sym }); allIds.push(DEAD_STATE); }
  const acceptIds = [...keyToId.values()].filter(id => (labelMap.get(id)||[]).includes(nfaAccept));
  return { start:startId, accept:acceptIds, states:allIds, transitions:dfaTransitions, labelMap, hasDeadState:needsDead };
};

const minimizeDFA = (dfa) => {
  const { states, transitions, start, accept } = dfa;
  const alpha = [...new Set(transitions.map(t => t.label))].sort();
  const acceptSet = new Set(accept);
  const transTable = {};
  for (const s of states) {
    transTable[s] = {};
    for (const sym of alpha) {
      const t = transitions.find(tr => tr.from === s && tr.label === sym);
      transTable[s][sym] = t ? t.to : null;
    }
  }
  let partition = [
    ...(states.filter(s => acceptSet.has(s)).length > 0 ? [states.filter(s => acceptSet.has(s))] : []),
    ...(states.filter(s => !acceptSet.has(s)).length > 0 ? [states.filter(s => !acceptSet.has(s))] : []),
  ];
  const groupIndex = (state) => state === null ? -1 : partition.findIndex(g => g.includes(state));
  let changed = true;
  while (changed) {
    changed = false;
    const next = [];
    for (const group of partition) {
      if (group.length === 1) { next.push(group); continue; }
      const subgroups = [];
      for (const state of group) {
        let placed = false;
        for (const sg of subgroups) {
          const rep = sg[0];
          let same = true;
          for (const sym of alpha) {
            if (groupIndex(transTable[state][sym]) !== groupIndex(transTable[rep][sym])) { same = false; break; }
          }
          if (same) { sg.push(state); placed = true; break; }
        }
        if (!placed) subgroups.push([state]);
      }
      if (subgroups.length > 1) changed = true;
      next.push(...subgroups);
    }
    partition = next;
  }
  const minId   = (idx) => `M${idx}`;
  const groupOf = (state) => partition.findIndex(g => g.includes(state));
  const minStart  = minId(groupOf(start));
  const minAccept = partition.map((g,i) => g.some(s => acceptSet.has(s)) ? minId(i) : null).filter(Boolean);
  const minStates = partition.map((_,i) => minId(i));
  const seen = new Set(), minTransitions = [];
  for (let i = 0; i < partition.length; i++) {
    const rep = partition[i][0];
    for (const sym of alpha) {
      const nextState = transTable[rep][sym];
      if (nextState === null) continue;
      const j = groupOf(nextState), key = `${i}_${j}_${sym}`;
      if (!seen.has(key)) { seen.add(key); minTransitions.push({ from:minId(i), to:minId(j), label:sym }); }
    }
  }
  const deadMinIds = new Set(minStates.filter(mid => {
    if (minAccept.includes(mid)) return false;
    return minTransitions.filter(t => t.from === mid).every(t => t.to === mid);
  }));
  return { start:minStart, accept:minAccept, states:minStates, transitions:minTransitions, deadStates:[...deadMinIds] };
};

const convertNfaToDfa = (nfa) => minimizeDFA(subsetConstruct(nfa));

// ─── SIMULATION ───────────────────────────────────────────────────────────────
const buildSimulationSteps = (dfa, input) => {
  const steps = [];
  let current = dfa.start;
  steps.push({ step: 0, from: null, to: current, label: null, isStart: true });
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const t = dfa.transitions.find(tr => tr.from === current && tr.label === char);
    if (!t) {
      steps.push({ step: i+1, from: current, to: null, label: char, isDead: true });
      return { steps, accepted: false };
    }
    steps.push({ step: i+1, from: current, to: t.to, label: char, isDead: false });
    current = t.to;
  }
  const accepted = dfa.accept.includes(current);
  return { steps, accepted };
};

// ─── LAYOUT ───────────────────────────────────────────────────────────────────
const bfsLayout = (startId, transitions, allStates, colW, rowH) => {
  const posMap = {}, visited = new Set(), colCount = {};
  const queue = [{ id: startId, col: 0 }];
  while (queue.length) {
    const { id, col } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    colCount[col] = colCount[col] || 0;
    posMap[id] = { x: col * colW + 80, y: colCount[col] * rowH + 80 };
    colCount[col]++;
    transitions.filter(t => t.from === id && t.to !== id).forEach(t => {
      if (!visited.has(t.to)) queue.push({ id: t.to, col: col+1 });
    });
  }
  allStates.forEach((id, i) => { if (!posMap[id]) posMap[id] = { x: i*colW+80, y: 400 }; });
  return posMap;
};

// ─── FLOW BUILDERS ────────────────────────────────────────────────────────────
const buildEdgeStyle = (t, isHighlighted, isDead) => ({
  stroke: isHighlighted ? '#fde047' : isDead ? '#6b2020' : '#a78bfa',
  strokeWidth: isHighlighted ? 3 : 1.8,
  filter: isHighlighted ? 'drop-shadow(0 0 6px #fde047)' : undefined,
});

const nfaToFlow = (nfa) => {
  const posMap = bfsLayout(nfa.start, nfa.transitions, nfa.states, 170, 110);
  const nodes = nfa.states.map((id, i) => ({
    id, type: 'stateNode', position: posMap[id],
    data: { label: id, nodeType: id === nfa.start ? 'start' : id === nfa.accept ? 'accept' : 'normal', delay: i*0.08 },
  }));
  const edgeMap = {};
  for (const t of nfa.transitions) {
    const key = `${t.from}__${t.to}`;
    edgeMap[key] ? (edgeMap[key].label += `, ${t.label}`) : (edgeMap[key] = { ...t });
  }
  const edges = Object.values(edgeMap).map((t, i) => {
    const isSelf = t.from === t.to, isEps = t.label.includes('ε');
    return {
      id: `e${i}`, source: t.from, target: t.to, label: t.label,
      type: isSelf ? 'selfLoop' : 'default', animated: isEps,
      style: { stroke: isEps ? '#6b7280' : '#22d3ee', strokeWidth: 1.5, strokeDasharray: isEps ? '5,4' : undefined },
      labelStyle: { fill: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#0a0d16', fillOpacity: 0.85 }, labelBgPadding: [4, 3],
      markerEnd: { type: MarkerType.ArrowClosed, color: isEps ? '#6b7280' : '#22d3ee' },
    };
  });
  return { nodes, edges };
};

const dfaToFlow = (dfa, simStep = null) => {
  const deadSet = new Set(dfa.deadStates || []);
  const posMap  = bfsLayout(dfa.start, dfa.transitions, dfa.states, 220, 140);

  // determine highlighted node & edge from current sim step
  const currentNode   = simStep?.to ?? null;
  const visitedNodes  = simStep?.visited ?? new Set();
  const highlightEdge = simStep ? `${simStep.from}__${simStep.to}` : null;

  const nodes = dfa.states.map((id, i) => {
    let nodeType = 'normal';
    if (id === dfa.start)        nodeType = 'start';
    if (dfa.accept.includes(id)) nodeType = 'accept';
    if (deadSet.has(id))         nodeType = 'dead';
    if (id === dfa.start && dfa.accept.includes(id)) nodeType = 'accept';
    const simState = id === currentNode ? 'current' : visitedNodes.has(id) ? 'visited' : null;
    return {
      id, type: 'stateNode', position: posMap[id],
      data: { label: id, nodeType, delay: i*0.1, simState },
    };
  });

  const edgeMap = {};
  for (const t of dfa.transitions) {
    const key = `${t.from}__${t.to}`;
    edgeMap[key] ? (edgeMap[key].label += `, ${t.label}`) : (edgeMap[key] = { ...t });
  }

  const edges = Object.values(edgeMap).map((t, i) => {
    const isSelf = t.from === t.to;
    const isDead = deadSet.has(t.to);
    const key    = `${t.from}__${t.to}`;
    const isHighlighted = key === highlightEdge;
    return {
      id: `de${i}`, source: t.from, target: t.to, label: t.label,
      type: isSelf ? 'selfLoop' : 'default', animated: isHighlighted,
      style: buildEdgeStyle(t, isHighlighted, isDead),
      labelStyle: { fill: isHighlighted ? '#fde047' : '#e2e8f0', fontSize: 11, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#0a0d16', fillOpacity: 0.85 }, labelBgPadding: [4, 3],
      markerEnd: { type: MarkerType.ArrowClosed, color: isHighlighted ? '#fde047' : isDead ? '#6b2020' : '#a78bfa' },
    };
  });

  return { nodes, edges };
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const AutomataPage = () => {
  const nodeTypes = useMemo(() => ({ stateNode: StateNode }), []);
  const edgeTypes = useMemo(() => ({ selfLoop: SelfLoopEdge }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [mode, setMode]                  = useState('NFA');
  const [regexInput, setRegexInput]      = useState('a(b)*');
  const [activePattern, setActivePattern] = useState('a(b)*');
  const [isCompiling, setIsCompiling]    = useState(false);
  const [currentNFA, setCurrentNFA]      = useState(null);
  const [currentDFA, setCurrentDFA]      = useState(null);

  // simulation state
  const [simInput, setSimInput]          = useState('');
  const [simSteps, setSimSteps]          = useState([]);
  const [simAccepted, setSimAccepted]    = useState(null);
  const [simIndex, setSimIndex]          = useState(-1);
  const [isSimulating, setIsSimulating]  = useState(false);
  const [simDone, setSimDone]            = useState(false);
  const simTimerRef                      = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [showSettings, setShowSettings]   = useState(false);
  const [showHelp, setShowHelp]           = useState(false);

  const tokens = useMemo(() => tokenizeRegex(activePattern), [activePattern]);
  const notify = (msg) => setNotifications(prev => [...prev, msg]);

  // ── compile ───────────────────────────────────────────────────────────────
  const handleCompile = () => {
    if (!regexInput.trim()) return;
    setIsCompiling(true);
    resetSimulation();
    setTimeout(() => {
      setActivePattern(regexInput);
      try {
        const nfa = buildNFA(toPostfix(insertConcatOps(tokenizeRegex(regexInput))));
        if (!nfa) throw new Error('NFA construction failed');
        setCurrentNFA(nfa);
        setCurrentDFA(null);
        const { nodes: n, edges: e } = nfaToFlow(nfa);
        setNodes(n); setEdges(e); setMode('NFA');
        notify(`NFA for "${regexInput}" — ${nfa.states.length} states, ${nfa.transitions.length} transitions`);
      } catch (err) { notify(`⚠ Error: ${err.message}`); }
      setIsCompiling(false);
    }, 800);
  };

  // ── convert ───────────────────────────────────────────────────────────────
  const convertToDFA = () => {
    if (!currentNFA) { notify('⚠ Generate an NFA first'); return; }
    resetSimulation();
    try {
      const dfa = convertNfaToDfa(currentNFA);
      setCurrentDFA(dfa);
      const { nodes: n, edges: e } = dfaToFlow(dfa);
      setNodes(n); setEdges(e); setMode('DFA');
      const deadNote = dfa.deadStates.length > 0 ? `, ${dfa.deadStates.length} trap state(s)` : '';
      notify(`Minimal DFA: ${dfa.states.length} state(s), ${dfa.accept.length} accept state(s)${deadNote}`);
    } catch (err) { notify(`⚠ DFA Error: ${err.message}`); }
  };

  // ── simulation helpers ────────────────────────────────────────────────────
  const resetSimulation = useCallback(() => {
    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    setSimSteps([]); setSimAccepted(null); setSimIndex(-1);
    setIsSimulating(false); setSimDone(false);
    // restore plain DFA view
    if (currentDFA) {
      const { nodes: n, edges: e } = dfaToFlow(currentDFA);
      setNodes(n); setEdges(e);
    }
  }, [currentDFA]);

  const applySimStep = useCallback((dfa, steps, idx) => {
    const step     = steps[idx];
    const visited  = new Set(steps.slice(0, idx+1).map(s => s.to).filter(Boolean));
    const simStep  = idx >= 0 ? { from: step.from, to: step.to, visited } : null;
    const { nodes: n, edges: e } = dfaToFlow(dfa, simStep);
    setNodes(n); setEdges(e);
  }, []);

  const runSimulation = useCallback(() => {
    if (!currentDFA) { notify('⚠ Convert to DFA first'); return; }
    if (isSimulating) return;
    resetSimulation();

    const { steps, accepted } = buildSimulationSteps(currentDFA, simInput);
    setSimSteps(steps);
    setSimAccepted(accepted);
    setIsSimulating(true);

    let idx = 0;
    const tick = () => {
      setSimIndex(idx);
      applySimStep(currentDFA, steps, idx);
      if (idx < steps.length - 1) {
        idx++;
        simTimerRef.current = setTimeout(tick, 500);
      } else {
        setIsSimulating(false);
        setSimDone(true);
      }
    };
    simTimerRef.current = setTimeout(tick, 100);
  }, [currentDFA, simInput, isSimulating, resetSimulation, applySimStep]);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col px-4 pb-4 relative overflow-hidden">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cyan-400 font-orbitron tracking-widest text-lg">AUTOMATA_CORE</h2>
        <div className="flex gap-4">
          <Bell className="text-gray-400 hover:text-cyan-400 cursor-pointer" size={18} />
          <Settings onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-purple-400 cursor-pointer" size={18} />
          <HelpCircle onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-green-400 cursor-pointer" size={18} />
        </div>
      </div>

      {/* REGEX INPUT */}
      <div className="flex gap-2 mb-3">
        <input
          value={regexInput}
          onChange={e => setRegexInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCompile()}
          placeholder="Enter regex…"
          className="flex-1 bg-[#0E121C] border border-cyan-400/30 px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-400/70 placeholder-gray-600 rounded"
        />
        <button
          onClick={handleCompile}
          disabled={isCompiling}
          className="text-cyan-400 border border-cyan-400/30 px-4 py-2 text-sm font-mono hover:bg-cyan-400/10 transition-colors rounded disabled:opacity-50"
        >
          {isCompiling ? '…' : 'NFA'}
        </button>
        <button
          onClick={convertToDFA}
          className="text-purple-400 border border-purple-400/30 px-4 py-2 text-sm font-mono hover:bg-purple-400/10 transition-colors rounded"
        >
          DFA
        </button>
      </div>

      {/* SIMULATION INPUT */}
      <div className="flex gap-2 mb-3">
        <input
          value={simInput}
          onChange={e => { setSimInput(e.target.value); if (simDone) resetSimulation(); }}
          onKeyDown={e => e.key === 'Enter' && runSimulation()}
          placeholder={mode === 'DFA' ? 'Enter string to simulate…' : 'Convert to DFA first to simulate…'}
          disabled={!currentDFA || isSimulating}
          className="flex-1 bg-[#0E121C] border border-yellow-400/30 px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-yellow-400/60 placeholder-gray-600 rounded disabled:opacity-40"
        />
        <button
          onClick={runSimulation}
          disabled={!currentDFA || isSimulating}
          className="flex items-center gap-1 text-yellow-400 border border-yellow-400/30 px-3 py-2 text-sm font-mono hover:bg-yellow-400/10 transition-colors rounded disabled:opacity-40"
        >
          <Play size={13} /> Simulate
        </button>
        {simDone && (
          <button
            onClick={resetSimulation}
            className="flex items-center gap-1 text-gray-400 border border-gray-600 px-3 py-2 text-sm font-mono hover:bg-gray-700/30 transition-colors rounded"
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* GRAPH */}
        <div className="flex-1 border border-[#1e2a3a] rounded overflow-hidden min-h-[360px]">
          <ReactFlow
            nodes={nodes} edges={edges}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            fitView
          >
            <Background color="#1a2035" gap={20} />
            <Controls />
          </ReactFlow>
        </div>

        {/* STEP TRACE PANEL */}
        {(simSteps.length > 0) && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-64 flex flex-col bg-[#080b14] border border-[#1e2a3a] rounded p-3 font-mono text-xs overflow-hidden"
          >
            <div className="text-gray-400 uppercase tracking-widest text-[10px] mb-2 border-b border-[#1e2a3a] pb-2">
              ⚡ Simulation Trace
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {simSteps.map((step, i) => {
                const isActive  = i === simIndex;
                const isPast    = i < simIndex;
                const isFuture  = i > simIndex;

                if (step.isStart) {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: isPast || isActive ? 1 : 0.3, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center gap-1 px-2 py-1 rounded ${isActive ? 'bg-yellow-900/40 text-yellow-300' : isPast ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      <ChevronRight size={10} className="shrink-0" />
                      <span>Start: <span className={isActive ? 'text-yellow-300' : 'text-cyan-400'}>{step.to}</span></span>
                    </motion.div>
                  );
                }

                if (step.isDead) {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: isActive || isPast ? 1 : 0.3, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center gap-1 px-2 py-1 rounded ${isActive ? 'bg-red-900/40 text-red-400' : 'text-gray-600'}`}
                    >
                      <ChevronRight size={10} className="shrink-0" />
                      <span>
                        Step {step.step}: <span className="text-gray-400">{step.from}</span>
                        <span className="text-red-500"> –{step.label}→ </span>∅
                      </span>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: isActive ? 1 : isPast ? 0.7 : 0.25, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-center gap-1 px-2 py-1 rounded ${
                      isActive ? 'bg-yellow-900/40 text-yellow-300' :
                      isPast   ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    <ChevronRight size={10} className="shrink-0" />
                    <span>
                      Step {step.step}:{' '}
                      <span className={isPast || isActive ? 'text-cyan-400' : 'text-gray-600'}>{step.from}</span>
                      <span className={isActive ? 'text-yellow-400' : isPast ? 'text-purple-400' : 'text-gray-700'}> –{step.label}→ </span>
                      <span className={isActive ? 'text-yellow-300' : isPast ? 'text-cyan-400' : 'text-gray-700'}>{step.to}</span>
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* RESULT BADGE */}
            {simDone && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mt-3 pt-2 border-t ${simAccepted ? 'border-green-800' : 'border-red-900'}`}
              >
                <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded font-bold tracking-widest text-xs ${
                  simAccepted
                    ? 'bg-green-900/40 text-green-400 border border-green-600/40 shadow-[0_0_16px_rgba(74,222,128,0.25)]'
                    : 'bg-red-900/40 text-red-400 border border-red-700/40 shadow-[0_0_16px_rgba(248,113,113,0.2)]'
                }`}>
                  {simAccepted ? '✅ ACCEPTED' : '❌ REJECTED'}
                </div>
                <div className="text-center text-[10px] text-gray-600 mt-1">
                  "{simInput}" {simAccepted ? 'matches' : 'does not match'} pattern
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      {/* TOKENS + MODE BAR */}
      <div className="mt-2 flex items-center justify-between text-gray-600 font-mono text-[10px]">
        <span>Tokens: {tokens.map(t => t.value).join(' ')}</span>
        <span className={`px-2 py-0.5 rounded border text-[10px] ${mode === 'NFA' ? 'border-cyan-800 text-cyan-600' : 'border-purple-800 text-purple-500'}`}>{mode}</span>
      </div>

      {/* NOTIFICATIONS */}
      <div className="fixed top-20 right-6 space-y-2 z-50">
        <AnimatePresence>
          {notifications.slice(-3).map((n, i) => (
            <motion.div
              key={`${i}-${n}`}
              initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }}
              className="bg-[#0B0F1A] border border-cyan-400/20 text-cyan-400 px-4 py-2 rounded text-xs max-w-xs"
            >
              ⚡ {n}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* SETTINGS */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0E121C] p-6 rounded-xl border border-gray-700">
            <h2 className="text-cyan-400 mb-4 font-mono">Settings</h2>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white font-mono text-sm">Close</button>
          </div>
        </div>
      )}

      {/* HELP */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0E121C] p-6 rounded-xl border border-gray-700 font-mono text-sm max-w-sm">
            <h2 className="text-green-400 mb-4">Regex Help</h2>
            <p className="text-gray-300 mb-2">Supported operators:</p>
            <ul className="text-gray-400 space-y-1 text-xs">
              <li><span className="text-cyan-400">*</span> — zero or more (e.g. a*)</li>
              <li><span className="text-cyan-400">+</span> — one or more (e.g. a+)</li>
              <li><span className="text-cyan-400">?</span> — zero or one (e.g. a?)</li>
              <li><span className="text-cyan-400">|</span> — union (e.g. a|b)</li>
              <li><span className="text-cyan-400">( )</span> — grouping</li>
            </ul>
            <p className="text-gray-500 mt-3 text-xs">Examples: a(b)*, (a|b)*abb, a+b?c</p>
            <button onClick={() => setShowHelp(false)} className="mt-4 text-gray-400 hover:text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomataPage;