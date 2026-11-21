import { copyText } from '../lib/clipboard';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ARM64Simulator, DEFAULT_MAX_STEPS } from './arm64Engine';
import { SAMPLE_PROGRAMS } from './samplePrograms';
import { gradeChallenge } from '../lib/grader';
import { markSolved, saveDraft, getDraft } from '../lib/progress';
import { SIM_INCLUDES } from './includes';
import {
  Play, Pause, RotateCcw, StepForward, Cpu, Terminal, Database, Sliders,
  CheckCircle, Code2, Trash2, Copy, Check, AlertTriangle
} from 'lucide-react';

const MASK_64 = 0xFFFFFFFFFFFFFFFFn;
const MASK_32 = 0xFFFFFFFFn;
const LINE_HEIGHT = 22;

function toSigned(val, bits) {
  return BigInt.asIntN(bits, BigInt(val) & (bits === 64 ? MASK_64 : MASK_32));
}

function parseAddr(text) {
  try {
    const t = String(text).trim();
    if (!t) return null;
    return BigInt.asUintN(64, BigInt(/^-?\d+$/.test(t) || /^0x/i.test(t) ? t : `0x${t}`));
  } catch {
    return null;
  }
}

function computeMemoryRows(sim, memBaseAddr) {
  const base = (parseAddr(memBaseAddr) ?? 0x410000n) & ~0xFn;
  const rows = [];
  for (let r = 0; r < 8; r++) {
    const rowAddr = base + BigInt(r * 16);
    const mapped = sim.isMapped ? sim.isMapped(rowAddr) : true;
    const hexBytes = [];
    let ascii = '';
    for (let c = 0; c < 16; c++) {
      const a = rowAddr + BigInt(c);
      if (sim.isMapped && !sim.isMapped(a)) { hexBytes.push('--'); ascii += ' '; continue; }
      const byte = sim.readByte(a);
      hexBytes.push(byte.toString(16).toUpperCase().padStart(2, '0'));
      ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
    }
    rows.push({
      addr: '0x' + rowAddr.toString(16).toUpperCase().padStart(8, '0'),
      hex1: hexBytes.slice(0, 8).join(' '),
      hex2: hexBytes.slice(8, 16).join(' '),
      ascii,
      mapped,
      isSp: sim.sp >= rowAddr && sim.sp < rowAddr + 16n,
    });
  }
  return rows;
}

export default function CPULator({
  initialCode = null,
  challenge = null,
  onCompleteChallenge = null
}) {
  const draftKey = challenge ? `challenge:${challenge.id}` : null;
  const [sourceCode, setSourceCode] = useState(() => {
    // Restore an unfinished attempt, but never over an explicitly loaded solution.
    const draft = draftKey && initialCode === challenge?.starterCode ? getDraft(draftKey) : undefined;
    return draft || initialCode || SAMPLE_PROGRAMS[0].code;
  });
  const [selectedSample, setSelectedSample] = useState(() => (initialCode ? 'custom' : SAMPLE_PROGRAMS[0].id));
  const [regMode, setRegMode] = useState('64');
  const [radixMode, setRadixMode] = useState('hex');
  const [speed, setSpeed] = useState(100); // ms between steps; 0 = full speed
  const [activeTab, setActiveTab] = useState('registers');
  const [memBaseAddr, setMemBaseAddr] = useState('0x410000');
  const [stdinText, setStdinText] = useState('');
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [grading, setGrading] = useState(false);

  const simRef = useRef(null);
  if (simRef.current == null) simRef.current = new ARM64Simulator({ includes: SIM_INCLUDES });

  const [simState, setSimState] = useState(() => ({
    isAssembled: false, isRunning: false, isTerminated: false, currentLine: -1,
    pc: 0x400000n, sp: 0x7FFF00n, cycles: 0, flags: { N: 0, Z: 1, C: 0, V: 0 },
    x: new Array(31).fill(0n), v: new Array(32).fill(0n), changedRegisters: new Set(), breakpoints: new Set(),
    stdout: '', stderr: '', exitCode: null, memoryRows: [], statusMessage: 'Ready to assemble',
    error: null, errorLine: null, fault: null, warnings: [], testResults: null
  }));

  const runTimerRef = useRef(null);
  const textareaRef = useRef(null);
  const memBaseRef = useRef(memBaseAddr);
  memBaseRef.current = memBaseAddr;

  const stopTimer = () => {
    if (runTimerRef.current) { clearTimeout(runTimerRef.current); runTimerRef.current = null; }
  };

  const syncState = useCallback((extra = {}) => {
    const sim = simRef.current;
    setSimState(prev => ({
      ...prev,
      isAssembled: sim.isAssembled,
      isTerminated: sim.isTerminated,
      currentLine: sim.getCurrentLineIndex(),
      pc: sim.pc, sp: sim.sp, cycles: sim.cycleCount,
      flags: { ...sim.flags }, x: [...sim.x], v: [...sim.v],
      changedRegisters: new Set(sim.changedRegisters),
      breakpoints: new Set(sim.breakpoints),
      stdout: sim.stdout, stderr: sim.stderr, exitCode: sim.exitCode,
      fault: sim.fault,
      memoryRows: computeMemoryRows(sim, memBaseRef.current),
      ...extra
    }));
  }, []);

  // Assemble the given source (defaults to the editor contents).
  const assemble = useCallback((code) => {
    stopTimer();
    const sim = simRef.current;
    sim.stdin = stdinText;
    const res = sim.assemble(code);
    sim.stdin = stdinText;
    sim.stdinPos = 0;
    setDirty(false);
    if (res.success) {
      const warn = res.warnings?.length ? ` - ${res.warnings.length} warning(s)` : '';
      syncState({
        isRunning: false, error: null, errorLine: null, warnings: res.warnings || [], testResults: null,
        statusMessage: `Assembled ${res.instructionCount} instructions. Entry: ${sim.entryName || 'first instruction'} @ 0x${res.entryPc.toString(16)}${warn}`
      });
      return true;
    }
    syncState({
      isRunning: false, statusMessage: 'Assembly failed', error: res.error,
      errorLine: res.errors?.[0]?.line ?? null, warnings: res.warnings || [], testResults: null
    });
    return false;
  }, [stdinText, syncState]);

  const handleAssemble = () => assemble(sourceCode);

  // Assemble once on mount (and when a different snippet is loaded).
  useEffect(() => {
    // Syncing the external simulator with the editor's initial code.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    assemble(sourceCode);
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (simRef.current?.isAssembled) setSimState(prev => ({ ...prev, memoryRows: computeMemoryRows(simRef.current, memBaseAddr) }));
  }, [memBaseAddr]);

  // Persist challenge drafts so a closed modal does not lose work.
  useEffect(() => {
    if (!draftKey) return undefined;
    const t = setTimeout(() => saveDraft(draftKey, sourceCode), 400);
    return () => clearTimeout(t);
  }, [draftKey, sourceCode]);

  const ensureFresh = () => {
    const sim = simRef.current;
    if (dirty || !sim.isAssembled) return assemble(sourceCode) && simRef.current.isAssembled;
    return true;
  };

  const describe = (res) => {
    if (res.status === 'breakpoint') return `Breakpoint hit at line ${res.line + 1}`;
    if (res.status === 'error') return res.message;
    if (res.status === 'timeout') return res.message;
    return res.message || 'Execution completed';
  };

  const handleStep = useCallback(() => {
    stopTimer();
    if (!ensureFresh()) return;
    const sim = simRef.current;
    if (sim.isTerminated) { syncState({ isRunning: false, statusMessage: 'Program terminated. Press Assemble / Reset to restart.' }); return; }
    const res = sim.step();
    if (res.status === 'ok') syncState({ isRunning: false, statusMessage: `Executed instruction ${sim.cycleCount}` });
    else syncState({ isRunning: false, statusMessage: describe(res), error: res.status === 'error' ? res.message : null, errorLine: res.fault?.line ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, sourceCode, syncState]);

  const handleRun = useCallback(() => {
    if (!ensureFresh()) return;
    const sim = simRef.current;
    if (sim.isTerminated) return;
    stopTimer();
    setSimState(prev => ({ ...prev, isRunning: true, statusMessage: 'Running...' }));
    let budget = DEFAULT_MAX_STEPS;
    // Execute in slices: one instruction per tick when animating, big batches
    // at full speed, so long programs never freeze the tab.
    const tick = () => {
      const batch = speed === 0 ? 20000 : 1;
      let res = { status: 'ok' };
      for (let i = 0; i < batch && budget > 0; i++, budget--) {
        res = sim.step();
        if (res.status !== 'ok') break;
      }
      if (res.status === 'ok' && budget <= 0) res = { status: 'timeout', message: `Stopped after ${DEFAULT_MAX_STEPS.toLocaleString()} instructions - possible infinite loop` };
      if (res.status !== 'ok') {
        runTimerRef.current = null;
        syncState({ isRunning: false, statusMessage: describe(res), error: res.status === 'error' ? res.message : null, errorLine: res.fault?.line ?? null });
        if (sim.isTerminated) setActiveTab(t => (sim.stdout || sim.stderr ? 'console' : t));
        return;
      }
      syncState();
      runTimerRef.current = setTimeout(tick, speed);
    };
    runTimerRef.current = setTimeout(tick, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, sourceCode, speed, syncState]);

  const handlePause = () => {
    stopTimer();
    setSimState(prev => ({ ...prev, isRunning: false, statusMessage: 'Paused' }));
  };

  const handleToggleBreakpoint = (lineIdx) => {
    simRef.current.toggleBreakpoint(lineIdx);
    syncState();
  };

  // Keyboard shortcuts: F7 step, F8 run/continue.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F7') { e.preventDefault(); handleStep(); }
      else if (e.key === 'F8') {
        e.preventDefault();
        if (runTimerRef.current) { stopTimer(); setSimState(prev => ({ ...prev, isRunning: false, statusMessage: 'Paused' })); }
        else handleRun();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleStep, handleRun]);

  const handleVerifyChallenge = () => {
    if (!challenge) return;
    setGrading(true);
    // Defer so the "Checking..." state can paint before a long grading run.
    setTimeout(() => {
      const result = gradeChallenge(challenge, sourceCode, { includes: SIM_INCLUDES });
      // Load the program into the debugger first (this clears old results),
      // then show the new results.
      assemble(sourceCode);
      setGrading(false);
      setSimState(prev => ({ ...prev, testResults: result }));
      if (result.passed) {
        markSolved(challenge.id);
        if (onCompleteChallenge) onCompleteChallenge(challenge.id);
      }
    }, 10);
  };

  const formatReg = (val, is32 = false) => {
    const v = is32 ? (val & MASK_32) : val;
    if (radixMode === 'hex') {
      const hexStr = v.toString(16).toUpperCase();
      return '0x' + hexStr.padStart(is32 ? 8 : 16, '0');
    }
    return toSigned(v, is32 ? 32 : 64).toString();
  };

  const handleCopyCode = async () => {
    if (await copyText(sourceCode)) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const onEditorKeyDown = (e) => {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const ta = e.target;
      const { selectionStart: s, selectionEnd: en } = ta;
      const next = sourceCode.slice(0, s) + '    ' + sourceCode.slice(en);
      setSourceCode(next); setDirty(true);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4; });
    }
  };

  const lines = sourceCode.split('\n');
  const nonZeroFp = simState.v.map((b, i) => [i, b]).filter(([, b]) => b !== 0n).slice(0, 8);

  return (
    <div className="cpulator-container">
      <div className="cpulator-toolbar">
        <div className="cpulator-toolbar-group">
          <div className="cpulator-brand">
            <Cpu size={20} className="text-cyan-400" />
            <span className="cpulator-title">CPULator ARM64</span>
            <span className="cpulator-badge">AArch64 Linux</span>
          </div>
          <div className="cpulator-sample-select-wrapper">
            <select
              value={selectedSample}
              onChange={(e) => {
                const sample = SAMPLE_PROGRAMS.find(p => p.id === e.target.value);
                if (sample) { setSelectedSample(sample.id); setSourceCode(sample.code); assemble(sample.code); }
              }}
              className="cpulator-select"
              aria-label="Load a sample program"
            >
              {selectedSample === 'custom' && <option value="custom">Current Lesson Code</option>}
              {SAMPLE_PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        </div>

        <div className="cpulator-controls">
          <button onClick={handleAssemble} className="cpulator-btn cpulator-btn-secondary" title="Assemble & Reset">
            <RotateCcw size={15} /><span>Assemble</span>
          </button>
          <button onClick={handleStep} disabled={simState.isRunning || (simState.isTerminated && !dirty)} className="cpulator-btn cpulator-btn-action" title="Step one instruction (F7)">
            <StepForward size={16} /><span>Step</span>
          </button>
          {simState.isRunning ? (
            <button onClick={handlePause} className="cpulator-btn cpulator-btn-warning" title="Pause (F8)">
              <Pause size={16} /><span>Pause</span>
            </button>
          ) : (
            <button onClick={handleRun} disabled={simState.isTerminated && !dirty} className="cpulator-btn cpulator-btn-primary" title="Run / Continue (F8)">
              <Play size={16} /><span>Run</span>
            </button>
          )}
        </div>

        <div className="cpulator-toolbar-group">
          <div className="cpulator-speed-control">
            <Sliders size={14} className="text-slate-400" />
            <input type="range" min="0" max="500" step="10" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
              title={speed === 0 ? 'Full speed' : `Delay: ${speed}ms per instruction`} className="cpulator-slider" aria-label="Run speed" />
            <span className="cpulator-speed-label">{speed === 0 ? 'max' : `${speed}ms`}</span>
          </div>
          <div className="cpulator-cycle-badge">Instr: <strong className="text-cyan-300">{simState.cycles}</strong></div>
        </div>
      </div>

      <div className={`cpulator-status-bar ${simState.error ? 'status-error' : ''}`}>
        <div className="status-indicator">
          <span className={`status-dot ${simState.isRunning ? 'dot-running' : simState.isTerminated ? 'dot-terminated' : 'dot-ready'}`} />
          <span className="status-text">{dirty ? 'Source changed - Step/Run will re-assemble' : (simState.error || simState.statusMessage)}</span>
        </div>
        <div className="status-pc">
          <span>PC: </span><code>0x{simState.pc.toString(16).toUpperCase().padStart(8, '0')}</code>
          <span className="ml-3">SP: </span><code>0x{simState.sp.toString(16).toUpperCase().padStart(8, '0')}</code>
        </div>
      </div>
      {simState.warnings?.length > 0 && !simState.error && (
        <div className="cpulator-warning-bar">
          <AlertTriangle size={13} /> {simState.warnings.join(' | ')}
        </div>
      )}

      <div className="cpulator-workspace">
        <div className="cpulator-editor-panel">
          <div className="editor-header">
            <div className="flex items-center gap-2">
              <Code2 size={16} className="text-cyan-400" />
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-300">ARM64 Assembly Source</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCopyCode} className="editor-header-btn" title="Copy Code">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {challenge && initialCode && (
                <button onClick={() => { if (window.confirm('Replace your code with the original starter template?')) { setSourceCode(initialCode); setDirty(true); } }} className="editor-header-btn" title="Restore starter code">
                  <RotateCcw size={14} /><span>Starter</span>
                </button>
              )}
              <button onClick={() => { setSourceCode(''); setDirty(true); }} className="editor-header-btn" title="Clear Editor" aria-label="Clear editor">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="editor-body">
            <div className="editor-gutter">
              {lines.map((_, idx) => {
                const isCurrent = simState.currentLine === idx && !simState.isTerminated;
                const isBp = simState.breakpoints.has(idx);
                const isErr = simState.errorLine === idx;
                return (
                  <div key={idx} className={`gutter-line ${isCurrent ? 'gutter-current' : ''} ${isErr ? 'gutter-error' : ''}`}
                    onClick={() => handleToggleBreakpoint(idx)} title={`Line ${idx + 1} - click to toggle breakpoint`}>
                    <span className="line-num">{idx + 1}</span>
                    <span className={`bp-dot ${isBp ? 'bp-active' : ''}`} />
                    {isCurrent && <span className="pc-arrow">▶</span>}
                  </div>
                );
              })}
            </div>
            <textarea
              ref={textareaRef}
              value={sourceCode}
              onChange={(e) => { setSourceCode(e.target.value); setDirty(true); setSelectedSample(s => (s === 'custom' ? s : s)); }}
              onKeyDown={onEditorKeyDown}
              spellCheck="false"
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              className="editor-textarea"
              style={{ height: `${lines.length * LINE_HEIGHT + 16}px` }}
              placeholder="// Type your ARM64 assembly here..."
              aria-label="Assembly source code"
            />
          </div>

          {challenge && (
            <div className="cpulator-challenge-box">
              <div className="challenge-box-header">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <strong>Challenge: {challenge.title}</strong>
                </div>
                <button onClick={handleVerifyChallenge} disabled={grading} className="cpulator-btn cpulator-btn-primary text-xs py-1 px-3">
                  {grading ? 'Checking...' : 'Verify Solution'}
                </button>
              </div>
              <p className="challenge-desc">{challenge.description}</p>

              {simState.testResults && (
                <div className={`challenge-test-results ${simState.testResults.passed ? 'tests-pass' : 'tests-fail'}`}>
                  <div className="test-overall-badge">
                    {simState.testResults.passed ? '✓ All tests passed - progress saved' : '✗ Not yet'}
                  </div>
                  {simState.testResults.assembleError && (
                    <div className="test-item item-fail"><span>✗ Does not assemble: {simState.testResults.assembleError}</span></div>
                  )}
                  <div className="test-list">
                    {simState.testResults.cases.map((c, ci) => (
                      <div key={ci} className="test-case-group">
                        {simState.testResults.cases.length > 1 && (
                          <div className={`test-case-name ${c.passed ? 'item-pass' : 'item-fail'}`}>{c.passed ? '✓' : '✗'} {c.name}</div>
                        )}
                        {c.message && <div className="test-item item-fail"><span>✗ {c.message}</span></div>}
                        {c.tests.map((t, idx) => (
                          <div key={idx} className={`test-item ${t.passed ? 'item-pass' : 'item-fail'}`}>
                            <span>{t.passed ? '✓' : '✗'} {t.description}</span>
                            {!t.passed && <span className="test-diff">Expected: {t.expected}, got: {t.actual}</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="cpulator-inspector-panel">
          <div className="inspector-tabs" role="tablist">
            <button role="tab" aria-selected={activeTab === 'registers'} className={`inspector-tab ${activeTab === 'registers' ? 'tab-active' : ''}`} onClick={() => setActiveTab('registers')}>
              <Cpu size={14} /><span>Registers & Flags</span>
            </button>
            <button role="tab" aria-selected={activeTab === 'memory'} className={`inspector-tab ${activeTab === 'memory' ? 'tab-active' : ''}`} onClick={() => setActiveTab('memory')}>
              <Database size={14} /><span>Memory</span>
            </button>
            <button role="tab" aria-selected={activeTab === 'console'} className={`inspector-tab ${activeTab === 'console' ? 'tab-active' : ''}`} onClick={() => setActiveTab('console')}>
              <Terminal size={14} /><span>I/O Console</span>
              {(simState.stdout || simState.stderr) && <span className="tab-pill" />}
            </button>
          </div>

          {activeTab === 'registers' && (
            <div className="inspector-content">
              <div className="flags-bar">
                <span className="flags-label">NZCV Flags:</span>
                <div className="flags-group">
                  {[['N', 'Negative (sign bit of result)'], ['Z', 'Zero (result was zero)'], ['C', 'Carry (unsigned overflow / no borrow)'], ['V', 'Overflow (signed overflow)']].map(([f, title]) => (
                    <div key={f} className={`flag-badge ${simState.flags[f] ? 'flag-on' : ''}`} title={title}>
                      <span className="flag-name">{f}</span><span className="flag-val">{simState.flags[f]}</span>
                    </div>
                  ))}
                </div>
                <div className="reg-format-toggles">
                  <div className="toggle-pill-group">
                    <button className={`toggle-pill ${regMode === '64' ? 'pill-active' : ''}`} onClick={() => setRegMode('64')}>X (64-bit)</button>
                    <button className={`toggle-pill ${regMode === '32' ? 'pill-active' : ''}`} onClick={() => setRegMode('32')}>W (32-bit)</button>
                  </div>
                  <div className="toggle-pill-group">
                    <button className={`toggle-pill ${radixMode === 'hex' ? 'pill-active' : ''}`} onClick={() => setRadixMode('hex')}>Hex</button>
                    <button className={`toggle-pill ${radixMode === 'dec' ? 'pill-active' : ''}`} onClick={() => setRadixMode('dec')}>Dec</button>
                  </div>
                </div>
              </div>

              <div className="special-regs-grid">
                <div className="special-reg-item"><span className="spec-name">PC</span><span className="spec-val">0x{simState.pc.toString(16).toUpperCase()}</span></div>
                <div className={`special-reg-item ${simState.changedRegisters.has('sp') ? 'reg-changed' : ''}`}><span className="spec-name">SP</span><span className="spec-val">0x{simState.sp.toString(16).toUpperCase()}{simState.sp % 16n ? ' ⚠ unaligned' : ''}</span></div>
                <div className="special-reg-item"><span className="spec-name">FP (X29)</span><span className="spec-val">0x{simState.x[29].toString(16).toUpperCase()}</span></div>
                <div className="special-reg-item"><span className="spec-name">LR (X30)</span><span className="spec-val">0x{simState.x[30].toString(16).toUpperCase()}</span></div>
              </div>

              <div className="registers-grid">
                {simState.x.map((val, idx) => {
                  const regName = regMode === '64' ? `X${idx}` : `W${idx}`;
                  const isChanged = simState.changedRegisters.has(`x${idx}`);
                  const formatted = formatReg(val, regMode === '32');
                  return (
                    <div key={idx} className={`register-card ${isChanged ? 'reg-changed' : ''}`}>
                      <span className="reg-id">{regName}</span>
                      <span className="reg-val" title={formatted}>{formatted}</span>
                    </div>
                  );
                })}
              </div>
              {nonZeroFp.length > 0 && (
                <div className="registers-grid fp-grid">
                  {nonZeroFp.map(([i]) => (
                    <div key={i} className={`register-card ${simState.changedRegisters.has(`d${i}`) || simState.changedRegisters.has(`s${i}`) ? 'reg-changed' : ''}`}>
                      <span className="reg-id">D{i}</span>
                      <span className="reg-val">{simRef.current.getDouble(i)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="inspector-content">
              <div className="memory-nav-bar">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Address:</span>
                  <input type="text" value={memBaseAddr} onChange={(e) => setMemBaseAddr(e.target.value)}
                    className={`memory-addr-input ${parseAddr(memBaseAddr) === null ? 'input-invalid' : ''}`} placeholder="0x410000" aria-label="Memory address" />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setMemBaseAddr('0x400000')} className="mem-jump-btn">.text</button>
                  <button onClick={() => setMemBaseAddr('0x410000')} className="mem-jump-btn">.data</button>
                  <button onClick={() => setMemBaseAddr('0x' + ((simState.sp - 32n) & ~0xFn).toString(16))} className="mem-jump-btn">Stack (SP)</button>
                  <button onClick={() => setMemBaseAddr('0x600000')} className="mem-jump-btn">Heap</button>
                </div>
              </div>
              <div className="memory-table-wrapper">
                <table className="memory-table">
                  <thead><tr><th>Address</th><th>+0 .. +7</th><th>+8 .. +F</th><th>ASCII</th></tr></thead>
                  <tbody>
                    {simState.memoryRows.map((row, idx) => (
                      <tr key={idx} className={`${row.mapped ? '' : 'mem-unmapped'} ${row.isSp ? 'mem-sp-row' : ''}`}>
                        <td className="mem-addr">{row.addr}{row.isSp ? ' ◀sp' : ''}</td>
                        <td className="mem-hex">{row.hex1}</td>
                        <td className="mem-hex">{row.hex2}</td>
                        <td className="mem-ascii">{row.ascii}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-slate-500 mt-2">“--” marks unmapped memory: touching it is a segmentation fault.</p>
              </div>
            </div>
          )}

          {activeTab === 'console' && (
            <div className="inspector-content console-tab-content">
              <div className="console-header">
                <span className="text-xs text-slate-400">stdin (read before Assemble / Run):</span>
              </div>
              <textarea className="stdin-input" value={stdinText} onChange={(e) => { setStdinText(e.target.value); setDirty(true); }}
                placeholder="Input for read(0, ...) / getchar()" rows={2} spellCheck="false" aria-label="Program stdin" />
              <div className="console-header">
                <span className="text-xs text-slate-400">stdout / stderr</span>
              </div>
              <div className="terminal-display">
                <pre>{simState.stdout || (!simState.stderr && '// Program output appears here (write syscall x8=64, printf, puts...)')}</pre>
                {simState.stderr && <pre className="terminal-stderr">{simState.stderr}</pre>}
                {simState.isTerminated && (
                  <div className={`terminal-exit-badge ${simState.fault ? 'exit-fault' : ''}`}>
                    {simState.fault ? `Killed by ${simState.fault.signal} (exit status ${simState.exitCode})` : `Program exited with status ${simState.exitCode ?? 0}`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
