import React, { useState, useMemo } from 'react';
import ReactFlow, {
  Controls, Background,
  useNodesState, useEdgesState,
  MarkerType, Handle, Position,
  EdgeLabelRenderer, BaseEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Settings, Bell, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
//  SELF-LOOP EDGE
//  React Flow sets source === target to the same x/y, which
//  produces a zero-length invisible path.  We draw the loop
//  manually as a cubic bezier arc above the node.
// ─────────────────────────────────────────────────────────────
const SelfLoopEdge = ({ id, sourceX, sourceY, label, style, markerEnd }) => {
  // Control-point spread and lift height
  const spread = 40;
  const lift   = 70;

  // Cubic bezier: start slightly left of center, arc upward, land slightly right
  const d = [
    `M ${sourceX - 8},${sourceY - 10}`,
    `C ${sourceX - spread},${sourceY - lift}`,
    `  ${sourceX + spread},${sourceY - lift}`,
    `  ${sourceX + 8},${sourceY - 10}`,
  ].join(' ');

  // Label sits at the top of the arc
  const labelX = sourceX;
  const labelY = sourceY - lift - 4;

  return (
    <g>
      {/* The arc path */}
      <path
        id={id}
        d={d}
        fill="none"
        style={style}
        markerEnd={markerEnd}
      />
      {/* Label background pill */}
      {label && (
        <>
          <rect
            x={labelX - 12}
            y={labelY - 13}
            width={24}
            height={16}
            rx={3}
            fill="#0a0d16"
            fillOpacity={0.9}
          />
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#e2e8f0"
            fontSize={11}
            fontFamily="monospace"
          >
            {label}
          </text>
        </>
      )}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
//  CUSTOM STATE NODE  (untouched)
// ─────────────────────────────────────────────────────────────
const StateNode = ({ data, isConnectable }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { label, nodeType, delay } = data;

  let borderStyle  = 'border-[#374151]';
  let glowStyle    = 'shadow-none';
  let innerClasses = '';

  if (nodeType === 'start') {
    borderStyle = 'border-cyan-400';
    glowStyle   = isHovered ? 'shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'shadow-[0_0_8px_rgba(0,229,255,0.2)]';
  } else if (nodeType === 'accept') {
    borderStyle  = 'border-purple-400';
    glowStyle    = isHovered ? 'shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'shadow-[0_0_8px_rgba(168,85,247,0.2)]';
    innerClasses = 'ring-2 ring-purple-400/50 ring-inset';
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
        <div className="absolute -top-5 text-[10px] font-mono text-cyan-400 tracking-widest font-semibold">
          START
        </div>
      )}

      <div className={`w-[50px] h-[50px] rounded-full bg-[#0a0d16] flex items-center justify-center font-mono border-2 ${borderStyle} ${glowStyle} ${innerClasses}`}>
        {label}
      </div>

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="opacity-0" />
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
//  NFA BUILD PIPELINE  —  Thompson's Construction
// ─────────────────────────────────────────────────────────────

const tokenizeRegex = (regexStr) => {
  const ops = ['*', '|', '(', ')', '+', '?'];
  return regexStr.split('').map(c => ({ type: ops.includes(c) ? 'operator' : 'literal', value: c }));
};

const insertConcatOps = (tokens) => {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    out.push(tokens[i]);
    if (i + 1 < tokens.length) {
      const cur  = tokens[i];
      const next = tokens[i + 1];
      const curEnds    = cur.type  === 'literal' || [')', '*', '+', '?'].includes(cur.value);
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
    if (tok.type === 'literal') {
      out.push(tok);
    } else if (tok.value === '(') {
      ops.push(tok);
    } else if (tok.value === ')') {
      while (ops.length && ops[ops.length - 1].value !== '(') out.push(ops.pop());
      ops.pop();
    } else {
      while (
        ops.length &&
        ops[ops.length - 1].value !== '(' &&
        (PREC[ops[ops.length - 1].value] || 0) >= (PREC[tok.value] || 0)
      ) out.push(ops.pop());
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
      const [s0, s1] = [fs(), fs()];
      stack.push({ start: s0, accept: s1, states: [s0, s1],
        transitions: [{ from: s0, to: s1, label: tok.value }] });

    } else if (tok.value === '.') {
      const B = stack.pop(), A = stack.pop();
      stack.push({ start: A.start, accept: B.accept,
        states: [...A.states, ...B.states],
        transitions: [...A.transitions, { from: A.accept, to: B.start, label: 'ε' }, ...B.transitions] });

    } else if (tok.value === '|') {
      const B = stack.pop(), A = stack.pop(), [s, e] = [fs(), fs()];
      stack.push({ start: s, accept: e, states: [s, ...A.states, ...B.states, e],
        transitions: [
          { from: s, to: A.start, label: 'ε' }, { from: s, to: B.start, label: 'ε' },
          ...A.transitions, ...B.transitions,
          { from: A.accept, to: e, label: 'ε' }, { from: B.accept, to: e, label: 'ε' },
        ] });

    } else if (tok.value === '*') {
      const A = stack.pop(), [s, e] = [fs(), fs()];
      stack.push({ start: s, accept: e, states: [s, ...A.states, e],
        transitions: [
          { from: s, to: A.start, label: 'ε' }, { from: s, to: e, label: 'ε' },
          ...A.transitions,
          { from: A.accept, to: A.start, label: 'ε' }, { from: A.accept, to: e, label: 'ε' },
        ] });

    } else if (tok.value === '+') {
      const A = stack.pop(), [s, e] = [fs(), fs()];
      stack.push({ start: s, accept: e, states: [s, ...A.states, e],
        transitions: [
          { from: s, to: A.start, label: 'ε' }, ...A.transitions,
          { from: A.accept, to: A.start, label: 'ε' }, { from: A.accept, to: e, label: 'ε' },
        ] });

    } else if (tok.value === '?') {
      const A = stack.pop(), [s, e] = [fs(), fs()];
      stack.push({ start: s, accept: e, states: [s, ...A.states, e],
        transitions: [
          { from: s, to: A.start, label: 'ε' }, { from: s, to: e, label: 'ε' },
          ...A.transitions, { from: A.accept, to: e, label: 'ε' },
        ] });
    }
  }
  return stack[0] || null;
};

// ─────────────────────────────────────────────────────────────
//  SUBSET CONSTRUCTION  (NFA → raw DFA)
// ─────────────────────────────────────────────────────────────

const epsilonClosure = (stateSet, transitions) => {
  const closure = new Set(stateSet);
  const stack   = [...stateSet];
  while (stack.length) {
    const cur = stack.pop();
    for (const t of transitions) {
      if (t.from === cur && t.label === 'ε' && !closure.has(t.to)) {
        closure.add(t.to);
        stack.push(t.to);
      }
    }
  }
  return [...closure].sort();
};

const moveOn = (stateSet, symbol, transitions) =>
  [...new Set(
    transitions.filter(t => stateSet.includes(t.from) && t.label === symbol).map(t => t.to)
  )];

const getAlphabet = (transitions) =>
  [...new Set(transitions.map(t => t.label).filter(l => l !== 'ε'))].sort();

const subsetConstruct = (nfa) => {
  const { transitions, start: nfaStart, accept: nfaAccept } = nfa;
  const alpha = getAlphabet(transitions);

  const keyToId  = new Map();
  const labelMap = new Map();
  let counter    = 0;

  const getOrCreate = (nfaSet) => {
    const key = nfaSet.join(',');
    if (!keyToId.has(key)) {
      const id = `D${counter++}`;
      keyToId.set(key, id);
      labelMap.set(id, nfaSet);
    }
    return keyToId.get(key);
  };

  const startSet = epsilonClosure([nfaStart], transitions);
  const startId  = getOrCreate(startSet);

  const dfaTransitions = [];
  const processed      = new Set();
  const worklist       = [startSet];

  while (worklist.length) {
    const currentSet = worklist.shift();
    const currentId  = getOrCreate(currentSet);
    if (processed.has(currentId)) continue;
    processed.add(currentId);

    for (const symbol of alpha) {
      const moved = moveOn(currentSet, symbol, transitions);
      if (!moved.length) continue;

      const closure = epsilonClosure(moved, transitions);
      const nextId  = getOrCreate(closure);

      // ── Always push the transition, even when nextId === currentId.
      //    Self-loops (e.g. D2 --b--> D2) are valid DFA transitions. ──
      dfaTransitions.push({ from: currentId, to: nextId, label: symbol });

      if (!processed.has(nextId)) worklist.push(closure);
    }
  }

  const allIds    = [...keyToId.values()];
  const acceptIds = allIds.filter(id => (labelMap.get(id) || []).includes(nfaAccept));

  return { start: startId, accept: acceptIds, states: allIds, transitions: dfaTransitions, labelMap };
};

// ─────────────────────────────────────────────────────────────
//  HOPCROFT'S MINIMIZATION  (raw DFA → minimal DFA)
// ─────────────────────────────────────────────────────────────
const minimizeDFA = (dfa) => {
  const { states, transitions, start, accept } = dfa;
  const alpha     = [...new Set(transitions.map(t => t.label))].sort();
  const acceptSet = new Set(accept);

  // O(1) transition lookup
  const transTable = {};
  for (const s of states) {
    transTable[s] = {};
    for (const sym of alpha) {
      const t = transitions.find(tr => tr.from === s && tr.label === sym);
      transTable[s][sym] = t ? t.to : null;
    }
  }

  // Initial partition: {accept} vs {non-accept}
  const accepting    = states.filter(s =>  acceptSet.has(s));
  const nonAccepting = states.filter(s => !acceptSet.has(s));
  let partition      = [
    ...(accepting.length    > 0 ? [accepting]    : []),
    ...(nonAccepting.length > 0 ? [nonAccepting] : []),
  ];

  // groupIndex: which partition group does a state (or null dead-state) belong to?
  const groupIndex = (state) => {
    if (state === null) return -1;
    return partition.findIndex(g => g.includes(state));
  };

  // Iteratively split until stable
  let changed = true;
  while (changed) {
    changed = false;
    const next = [];

    for (const group of partition) {
      if (group.length === 1) { next.push(group); continue; }

      // Split: keep states together only if they go to the same group on every symbol
      const subgroups = [];
      for (const state of group) {
        let placed = false;
        for (const sg of subgroups) {
          const rep  = sg[0];
          let   same = true;
          for (const sym of alpha) {
            if (groupIndex(transTable[state][sym]) !== groupIndex(transTable[rep][sym])) {
              same = false; break;
            }
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

  // Build minimized DFA
  const minId   = (idx) => `M${idx}`;
  const groupOf = (state) => partition.findIndex(g => g.includes(state));

  const minStart  = minId(groupOf(start));
  const minAccept = partition
    .map((g, i) => g.some(s => acceptSet.has(s)) ? minId(i) : null)
    .filter(Boolean);
  const minStates = partition.map((_, i) => minId(i));

  // One transition per (from-group, symbol) — use group's first state as representative.
  // ── Self-loop transitions (i === j) are explicitly included. ──
  const seen = new Set();
  const minTransitions = [];
  for (let i = 0; i < partition.length; i++) {
    const rep = partition[i][0];
    for (const sym of alpha) {
      const next = transTable[rep][sym];
      if (next === null) continue;

      const j   = groupOf(next);
      const key = `${i}_${j}_${sym}`;
      if (!seen.has(key)) {
        seen.add(key);
        minTransitions.push({ from: minId(i), to: minId(j), label: sym });
      }
    }
  }

  return { start: minStart, accept: minAccept, states: minStates, transitions: minTransitions };
};

// Public entry point
const convertNfaToDfa = (nfa) => minimizeDFA(subsetConstruct(nfa));

// ─────────────────────────────────────────────────────────────
//  REACT FLOW CONVERTERS
// ─────────────────────────────────────────────────────────────

const bfsLayout = (startId, transitions, allStates, colW, rowH) => {
  const posMap = {}, visited = new Set(), colCount = {};
  const queue  = [{ id: startId, col: 0 }];
  while (queue.length) {
    const { id, col } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    colCount[col] = colCount[col] || 0;
    posMap[id]    = { x: col * colW + 80, y: colCount[col] * rowH + 80 };
    colCount[col]++;
    // Don't follow self-loops for layout purposes (already visited)
    transitions.filter(t => t.from === id && t.to !== id).forEach(t => {
      if (!visited.has(t.to)) queue.push({ id: t.to, col: col + 1 });
    });
  }
  allStates.forEach((id, i) => { if (!posMap[id]) posMap[id] = { x: i * colW + 80, y: 400 }; });
  return posMap;
};

const nfaToFlow = (nfa) => {
  const posMap = bfsLayout(nfa.start, nfa.transitions, nfa.states, 170, 110);
  const nodes  = nfa.states.map((id, i) => ({
    id, type: 'stateNode', position: posMap[id],
    data: { label: id, nodeType: id === nfa.start ? 'start' : id === nfa.accept ? 'accept' : 'normal', delay: i * 0.08 },
  }));
  const edgeMap = {};
  for (const t of nfa.transitions) {
    const key = `${t.from}__${t.to}`;
    edgeMap[key] ? (edgeMap[key].label += `, ${t.label}`) : (edgeMap[key] = { ...t });
  }
  const edges = Object.values(edgeMap).map((t, i) => {
    const isSelf = t.from === t.to;
    const isEps  = t.label.includes('ε');
    return {
      id: `e${i}`, source: t.from, target: t.to, label: t.label,
      // ── Self-loops use our custom edge type so they render correctly ──
      type: isSelf ? 'selfLoop' : 'default',
      animated: isEps,
      style: { stroke: isEps ? '#6b7280' : '#22d3ee', strokeWidth: 1.5, strokeDasharray: isEps ? '5,4' : undefined },
      labelStyle: { fill: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#0a0d16', fillOpacity: 0.85 }, labelBgPadding: [4, 3],
      markerEnd: { type: MarkerType.ArrowClosed, color: isEps ? '#6b7280' : '#22d3ee' },
    };
  });
  return { nodes, edges };
};

const dfaToFlow = (dfa) => {
  const posMap = bfsLayout(dfa.start, dfa.transitions, dfa.states, 220, 140);
  const nodes  = dfa.states.map((id, i) => ({
    id, type: 'stateNode', position: posMap[id],
    data: { label: id, nodeType: id === dfa.start ? 'start' : dfa.accept.includes(id) ? 'accept' : 'normal', delay: i * 0.1 },
  }));

  // Merge parallel edges (same from+to, different symbol) → combined label
  const edgeMap = {};
  for (const t of dfa.transitions) {
    const key = `${t.from}__${t.to}`;
    edgeMap[key] ? (edgeMap[key].label += `, ${t.label}`) : (edgeMap[key] = { ...t });
  }

  const edges = Object.values(edgeMap).map((t, i) => {
    const isSelf = t.from === t.to;
    return {
      id: `de${i}`, source: t.from, target: t.to, label: t.label,
      // ── Self-loops (e.g. M0 --b--> M0) MUST use 'selfLoop' type.
      //    React Flow renders source===target as invisible with 'default'. ──
      type: isSelf ? 'selfLoop' : 'default',
      animated: false,
      style: { stroke: '#a78bfa', strokeWidth: 1.8 },
      labelStyle: { fill: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#0a0d16', fillOpacity: 0.85 }, labelBgPadding: [4, 3],
      markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
    };
  });

  return { nodes, edges };
};

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const AutomataPage = () => {
  // Register both custom node and custom edge types
  const nodeTypes = useMemo(() => ({ stateNode: StateNode }), []);
  const edgeTypes = useMemo(() => ({ selfLoop: SelfLoopEdge }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [mode, setMode]                   = useState('NFA');
  const [regexInput, setRegexInput]       = useState('a(b)*');
  const [activePattern, setActivePattern] = useState('a(b)*');
  const [isCompiling, setIsCompiling]     = useState(false);
  const [currentNFA, setCurrentNFA]       = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [showSettings, setShowSettings]   = useState(false);
  const [showHelp, setShowHelp]           = useState(false);

  const tokens = useMemo(() => tokenizeRegex(activePattern), [activePattern]);
  const notify = (msg) => setNotifications(prev => [...prev, msg]);

  const handleCompile = () => {
    if (!regexInput.trim()) return;
    setIsCompiling(true);
    setTimeout(() => {
      setActivePattern(regexInput);
      try {
        const nfa = buildNFA(toPostfix(insertConcatOps(tokenizeRegex(regexInput))));
        if (!nfa) throw new Error('NFA construction failed');
        setCurrentNFA(nfa);
        const { nodes: n, edges: e } = nfaToFlow(nfa);
        setNodes(n); setEdges(e); setMode('NFA');
        notify(`NFA for "${regexInput}" — ${nfa.states.length} states, ${nfa.transitions.length} transitions`);
      } catch (err) { notify(`⚠ Error: ${err.message}`); }
      setIsCompiling(false);
    }, 800);
  };

  const convertToDFA = () => {
    if (!currentNFA) { notify('⚠ Generate an NFA first'); return; }
    try {
      const dfa = convertNfaToDfa(currentNFA);
      const { nodes: n, edges: e } = dfaToFlow(dfa);
      setNodes(n); setEdges(e); setMode('DFA');
      notify(`Minimal DFA: ${dfa.states.length} state(s), ${dfa.accept.length} accept state(s)`);
    } catch (err) { notify(`⚠ DFA Error: ${err.message}`); }
  };

  // ─────────────────────────────────────────────────────────
  //  JSX — completely untouched
  // ─────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col px-4 pb-4 relative">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-cyan-400 font-orbitron">AUTOMATA_CORE</h2>
        <div className="flex gap-4">
          <Bell className="text-gray-400 hover:text-cyan-400 cursor-pointer" />
          <Settings onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-purple-400 cursor-pointer" />
          <HelpCircle onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-green-400 cursor-pointer" />
        </div>
      </div>

      {/* INPUT */}
      <div className="flex gap-3 mb-6">
        <input value={regexInput} onChange={e => setRegexInput(e.target.value)} className="bg-[#0E121C] border px-3 py-2 text-white" />
        <button onClick={handleCompile} className="text-cyan-400">Generate</button>
        <button onClick={convertToDFA}>DFA</button>
      </div>

      {/* GRAPH — edgeTypes added alongside existing nodeTypes */}
      <div className="h-[400px] border">
        <ReactFlow
          nodes={nodes} edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* TOKENS */}
      <div className="mt-4 text-white font-mono text-sm">
        Tokens: {tokens.map(t => t.value).join(' ')}
      </div>

      {/* NOTIFICATIONS */}
      <div className="fixed top-20 right-6 space-y-2">
        <AnimatePresence>
          {notifications.slice(-3).map((n, i) => (
            <motion.div key={i} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }}
              className="bg-[#0B0F1A] border border-cyan-400/20 text-cyan-400 px-4 py-2 rounded text-xs">
              ⚡ {n}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* SETTINGS */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-[#0E121C] p-6 rounded-xl border">
            <h2 className="text-cyan-400 mb-4">Settings</h2>
            <button onClick={() => setShowSettings(false)}>Close</button>
          </div>
        </div>
      )}

      {/* HELP */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-[#0E121C] p-6 rounded-xl border">
            <h2 className="text-green-400 mb-4">Regex Help</h2>
            <p className="text-sm">a*, (a|b), ab</p>
            <button onClick={() => setShowHelp(false)}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AutomataPage;