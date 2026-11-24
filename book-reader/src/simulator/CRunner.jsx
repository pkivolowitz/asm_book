import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, X, Terminal, Cpu, Code2, CheckCircle, RotateCcw, Copy, Check, AlertTriangle, FileText, ShieldCheck } from 'lucide-react';
import { compileC, runC } from '../cc/toolchain';
import { C_SAMPLES } from '../cc/samples';
import { SIM_INCLUDES } from './includes';
import { gradeCLab } from '../lib/cGrader';
import { markSolved, saveDraft, getDraft } from '../lib/progress';
import { copyText } from '../lib/clipboard';
import { splitCodeFiles, primaryFile } from '../lib/codeFiles';

const LINE_HEIGHT = 22;
const isSource = (n) => /\.(c|h|s|S)$/.test(n);

// "a b 'c d'" -> ['a', 'b', 'c d']
function parseArgs(text) {
  const out = []; const re = /"([^"]*)"|'([^']*)'|(\S+)/g; let m;
  while ((m = re.exec(text))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

function toFileList(obj) { return Object.entries(obj).map(([name, content]) => ({ name, content: typeof content === 'string' ? content : new TextDecoder().decode(content) })); }

export default function CRunner({ initialCode = null, onLoadAsmInCpulator = null, lab = null, onSolved = null }) {
  const navigate = useNavigate();
  const draftKey = lab ? `clab:${lab.id}` : null;
  const [files, setFiles] = useState(() => {
    if (lab) {
      try { const d = getDraft(draftKey); if (d) { const parsed = JSON.parse(d); if (Array.isArray(parsed) && parsed.length) return parsed; } } catch { /* ignore bad draft */ }
      return toFileList(lab.files);
    }
    if (initialCode) return splitCodeFiles(initialCode) || [{ name: 'main.c', content: initialCode }];
    return toFileList(C_SAMPLES[0].files);
  });
  const [active, setActive] = useState(() => {
    if (lab) return Object.keys(lab.files)[0];
    const project = initialCode ? splitCodeFiles(initialCode) : null;
    return project ? primaryFile(project) : 'main.c';
  });
  const [sample, setSample] = useState(lab || initialCode ? 'custom' : C_SAMPLES[0].id);
  const [stdin, setStdin] = useState('');
  const [argsText, setArgsText] = useState('');
  const [asan, setAsan] = useState(true);
  const [tab, setTab] = useState('output');
  const [result, setResult] = useState(null);     // { build, run }
  const [grade, setGrade] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const taRef = useRef(null);

  const current = files.find(f => f.name === active) || files[0];
  const lines = (current?.content ?? '').split('\n');

  useEffect(() => {
    if (!draftKey) return undefined;
    const t = setTimeout(() => saveDraft(draftKey, JSON.stringify(files)), 400);
    return () => clearTimeout(t);
  }, [draftKey, files]);

  const updateActive = (content) => setFiles(fs => fs.map(f => (f.name === current.name ? { ...f, content } : f)));

  const sourceFiles = () => Object.fromEntries(files.filter(f => isSource(f.name)).map(f => [f.name, f.content]));
  const dataFiles = () => Object.fromEntries(files.filter(f => !isSource(f.name)).map(f => [f.name, f.content]));

  const handleRun = useCallback(() => {
    setBusy(true);
    setTimeout(() => {
      const build = compileC(sourceFiles());
      const run = build.ok ? runC(build, { stdin, args: parseArgs(argsText), files: dataFiles(), asan, leakCheck: asan, includes: SIM_INCLUDES }) : null;
      setResult({ build, run });
      setGrade(null);
      setTab('output');
      setBusy(false);
    }, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, stdin, argsText, asan]);

  const handleCheck = () => {
    if (!lab) return;
    setBusy(true);
    setTimeout(() => {
      const g = gradeCLab(lab, sourceFiles(), { includes: SIM_INCLUDES });
      setGrade(g);
      setResult(g.build ? { build: g.build, run: null } : null);
      setTab('output');
      setBusy(false);
      if (g.passed) { markSolved(lab.id); if (onSolved) onSolved(lab.id); }
    }, 10);
  };

  // Ctrl/Cmd+Enter runs
  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleRun(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleRun]);

  const addFile = () => {
    const name = window.prompt('File name (e.g. util.c, util.h, data.txt). Files that are not .c/.h/.s become input files in the program\'s filesystem.');
    if (!name) return;
    const clean = name.trim().replace(/^\.?\//, '');
    if (!/^[\w.-]+$/.test(clean)) { window.alert('Use letters, digits, ".", "-" and "_" only.'); return; }
    if (files.some(f => f.name === clean)) { setActive(clean); return; }
    setFiles(fs => [...fs, { name: clean, content: clean.endsWith('.h') ? `#ifndef ${clean.replace(/\W/g, '_').toUpperCase()}\n#define ${clean.replace(/\W/g, '_').toUpperCase()}\n\n#endif\n` : '' }]);
    setActive(clean);
  };

  const removeFile = (name) => {
    if (files.length <= 1) return;
    if (!window.confirm(`Delete ${name}?`)) return;
    setFiles(fs => fs.filter(f => f.name !== name));
    if (active === name) setActive(files.find(f => f.name !== name).name);
  };

  const loadSample = (id) => {
    const s = C_SAMPLES.find(x => x.id === id);
    if (!s) return;
    setSample(id); setFiles(toFileList(s.files)); setActive(Object.keys(s.files)[0]); setResult(null);
    if (id === 'hello') setArgsText('one "two words"');
  };

  const resetLab = () => {
    if (!lab || !window.confirm('Replace your files with the starter files?')) return;
    setFiles(toFileList(lab.files)); setActive(Object.keys(lab.files)[0]); setGrade(null); setResult(null);
  };

  const onEditorKeyDown = (e) => {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const ta = e.target; const s = ta.selectionStart; const en = ta.selectionEnd;
      updateActive(current.content.slice(0, s) + '    ' + current.content.slice(en));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4; });
    }
  };

  // diagnostics / fault markers for the active file
  const markers = useMemo(() => {
    const m = new Map();
    const b = result?.build;
    if (b) {
      for (const w of b.warnings || []) if (w.file === current?.name && w.line) m.set(w.line - 1, { kind: 'warning', text: w.message });
      for (const e of b.errors || []) if (e.file === current?.name && e.line) m.set(e.line - 1, { kind: 'error', text: e.message });
    }
    const loc = result?.run?.fault?.cLocation;
    if (loc && loc.file === current?.name) m.set(loc.line - 1, { kind: 'fault', text: result.run.fault.message });
    return m;
  }, [result, current]);

  // assembly listing for the active file, annotated with the C source lines
  const asmListing = useMemo(() => {
    const b = result?.build;
    if (!b?.ok) return '';
    const asmLines = b.asm.split('\n');
    const src = Object.fromEntries(files.map(f => [f.name, f.content.split('\n')]));
    const out = []; let last = null;
    asmLines.forEach((text, i) => {
      const loc = b.lineMap[i];
      if (!loc || loc.file !== current?.name) return;
      const key = `${loc.file}:${loc.line}`;
      if (key !== last) { out.push(`\n// ${key}:  ${(src[loc.file]?.[loc.line - 1] ?? '').trim()}`); last = key; }
      out.push(text);
    });
    return out.join('\n').trim();
  }, [result, files, current]);

  const debugInCpulator = () => {
    const b = result?.build;
    if (!b?.ok) return;
    if (onLoadAsmInCpulator) onLoadAsmInCpulator(b.asm);
    else navigate('/simulator', { state: { code: b.asm } });
  };

  const run = result?.run;
  const build = result?.build;
  const diagText = (d, kind) => `${d.file ? `${d.file}:${d.line ?? '?'}:${d.col ?? '?'}: ` : ''}${kind}: ${d.message}`;

  return (
    <div className="cpulator-container c-runner-container">
      <div className="cpulator-toolbar">
        <div className="cpulator-toolbar-group">
          <div className="cpulator-brand">
            <Terminal size={20} className="text-amber-400" />
            <span className="cpulator-title">C → ARM64</span>
            <span className="cpulator-badge">real compiler</span>
          </div>
          {!lab && (
            <select className="cpulator-select" value={sample} onChange={(e) => loadSample(e.target.value)} aria-label="Load a sample program">
              {sample === 'custom' && <option value="custom">Your code</option>}
              {C_SAMPLES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          )}
        </div>
        <div className="cpulator-controls">
          <label className="c-asan-toggle" title="AddressSanitizer-style heap checking and leak detection">
            <input type="checkbox" checked={asan} onChange={(e) => setAsan(e.target.checked)} />
            <ShieldCheck size={14} /> ASan
          </label>
          <button onClick={handleRun} disabled={busy} className="cpulator-btn cpulator-btn-primary" title="Compile and run (Ctrl+Enter)">
            <Play size={15} /><span>{busy ? 'Running...' : 'Run'}</span>
          </button>
          {lab && (
            <button onClick={handleCheck} disabled={busy} className="cpulator-btn cpulator-btn-action" title="Run the lab's hidden tests">
              <CheckCircle size={15} /><span>Check</span>
            </button>
          )}
          <button onClick={debugInCpulator} disabled={!build?.ok} className="cpulator-btn cpulator-btn-secondary" title="Step through the compiled program in the ARM64 debugger">
            <Cpu size={15} /><span>Debug</span>
          </button>
        </div>
      </div>

      <div className="cpulator-workspace">
        <div className="cpulator-editor-panel">
          <div className="c-file-tabs" role="tablist">
            {files.map(f => (
              <div key={f.name} className={`c-file-tab ${f.name === current?.name ? 'c-file-tab-active' : ''}`}>
                <button role="tab" aria-selected={f.name === current?.name} onClick={() => setActive(f.name)}>
                  {isSource(f.name) ? <Code2 size={12} /> : <FileText size={12} />} {f.name}
                </button>
                {files.length > 1 && !(lab && lab.files[f.name] !== undefined) && (
                  <button className="c-file-close" onClick={() => removeFile(f.name)} aria-label={`Delete ${f.name}`}><X size={11} /></button>
                )}
              </div>
            ))}
            <button className="c-file-add" onClick={addFile} title="Add a file"><Plus size={13} /></button>
            <div className="flex-1" />
            {lab && <button className="editor-header-btn" onClick={resetLab} title="Restore starter files"><RotateCcw size={13} /><span>Starter</span></button>}
            <button className="editor-header-btn" onClick={async () => { if (await copyText(current.content)) { setCopied(true); setTimeout(() => setCopied(false), 1500); } }} title="Copy file">
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
          <div className="editor-body">
            <div className="editor-gutter">
              {lines.map((_, idx) => {
                const mk = markers.get(idx);
                return (
                  <div key={idx} className={`gutter-line ${mk ? `gutter-${mk.kind}` : ''}`} title={mk ? mk.text : undefined}>
                    <span className="line-num">{idx + 1}</span>
                    {mk && <span className="pc-arrow">{mk.kind === 'warning' ? '!' : '✖'}</span>}
                  </div>
                );
              })}
            </div>
            <textarea
              ref={taRef}
              value={current?.content ?? ''}
              onChange={(e) => { updateActive(e.target.value); setSample('custom'); }}
              onKeyDown={onEditorKeyDown}
              spellCheck="false" autoCapitalize="off" autoCorrect="off" wrap="off"
              className="editor-textarea"
              style={{ height: `${lines.length * LINE_HEIGHT + 16}px` }}
              aria-label={`Contents of ${current?.name}`}
            />
          </div>
          {lab && (
            <div className="cpulator-challenge-box">
              <div className="challenge-box-header">
                <div className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-400" /><strong>Lab: {lab.title}</strong></div>
              </div>
              <p className="challenge-desc" style={{ whiteSpace: 'pre-line' }}>{lab.description}</p>
              {grade && (
                <div className={`challenge-test-results ${grade.passed ? 'tests-pass' : 'tests-fail'}`}>
                  <div className="test-overall-badge">{grade.passed ? '✓ All tests passed - progress saved' : '✗ Not yet'}</div>
                  {grade.compileError && <pre className="c-diag c-diag-error">{grade.compileError}</pre>}
                  <div className="test-list">
                    {grade.cases.map((c, ci) => (
                      <div key={ci} className="test-case-group">
                        {grade.cases.length > 1 && <div className={`test-case-name ${c.passed ? 'item-pass' : 'item-fail'}`}>{c.passed ? '✓' : '✗'} {c.name}</div>}
                        {c.message && <div className="test-item item-fail"><span>✗ {c.message}</span></div>}
                        {c.tests.map((t, i) => (
                          <div key={i} className={`test-item ${t.passed ? 'item-pass' : 'item-fail'}`}>
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
            <button role="tab" aria-selected={tab === 'output'} className={`inspector-tab ${tab === 'output' ? 'tab-active' : ''}`} onClick={() => setTab('output')}><Terminal size={14} /><span>Output</span></button>
            <button role="tab" aria-selected={tab === 'input'} className={`inspector-tab ${tab === 'input' ? 'tab-active' : ''}`} onClick={() => setTab('input')}><FileText size={14} /><span>Input</span>{(stdin || argsText) && <span className="tab-pill" />}</button>
            <button role="tab" aria-selected={tab === 'asm'} className={`inspector-tab ${tab === 'asm' ? 'tab-active' : ''}`} onClick={() => setTab('asm')}><Cpu size={14} /><span>Assembly</span></button>
          </div>

          {tab === 'input' && (
            <div className="inspector-content console-tab-content">
              <label className="text-xs text-slate-400" htmlFor="c-args">Command-line arguments (argv[1]...)</label>
              <input id="c-args" className="memory-addr-input c-args-input" value={argsText} onChange={(e) => setArgsText(e.target.value)} placeholder={'file.txt -v "quoted arg"'} />
              <label className="text-xs text-slate-400" htmlFor="c-stdin">stdin</label>
              <textarea id="c-stdin" className="stdin-input" rows={6} value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder="Input for scanf / fgets / getchar" spellCheck="false" />
              <p className="text-xs text-slate-500">Files that are not .c, .h or .s (add one with +) exist in the program's filesystem, so fopen("data.txt", "r") works. Files the program writes appear in the Output tab.</p>
            </div>
          )}

          {tab === 'asm' && (
            <div className="inspector-content console-tab-content">
              {build?.ok ? (
                <>
                  <p className="text-xs text-slate-400">Unoptimized ARM64 generated for <strong>{current?.name}</strong> (like gcc -O0). Each block is preceded by the C line it came from.</p>
                  <pre className="terminal-display c-asm-listing">{asmListing || '// no code generated for this file'}</pre>
                </>
              ) : <p className="text-sm text-slate-400">Run the program to see the assembly the compiler generates.</p>}
            </div>
          )}

          {tab === 'output' && (
            <div className="inspector-content console-tab-content">
              {!result && !grade && <p className="text-sm text-slate-400">Press Run (Ctrl+Enter). Your C is compiled to ARM64 assembly and executed on the simulated CPU, with a real stack and heap.</p>}
              {build && (build.errors.length > 0 || build.warnings.length > 0) && (
                <pre className="c-diag">
                  {build.errors.map((e, i) => <div key={`e${i}`} className="c-diag-error">{diagText(e, 'error')}</div>)}
                  {build.warnings.map((w, i) => <div key={`w${i}`} className="c-diag-warning">{diagText(w, 'warning')}</div>)}
                </pre>
              )}
              {run && (
                <div className="terminal-display">
                  <pre>{run.stdout || (!run.stderr && '// (no output)')}</pre>
                  {run.stderr && <pre className="terminal-stderr">{run.stderr}</pre>}
                  {run.fault && (
                    <div className="c-fault-box">
                      <AlertTriangle size={14} />
                      <div>
                        <strong>{run.fault.signal === 'ASAN' ? 'AddressSanitizer' : run.fault.signal}</strong>
                        {run.fault.cLocation && <> at <strong>{run.fault.cLocation.file}:{run.fault.cLocation.line}</strong></>}
                        {run.fault.backtrace?.length > 0 && <div className="text-xs">called from {run.fault.backtrace.map(b => `${b.file}:${b.line}`).join(' ← ')}</div>}
                      </div>
                    </div>
                  )}
                  {run.status === 'timeout' && <div className="c-fault-box"><AlertTriangle size={14} /> {run.message}</div>}
                  <div className={`terminal-exit-badge ${run.fault ? 'exit-fault' : ''}`}>
                    {run.fault ? `Killed by ${run.fault.signal === 'ASAN' ? 'AddressSanitizer' : run.fault.signal}` : run.status === 'timeout' ? 'Stopped' : `Exit status ${run.exitCode}`}
                    {' '}· {run.instructions?.toLocaleString()} instructions
                    {run.leaks?.length > 0 && ` · ${run.leaks.length} leak(s)`}
                  </div>
                  {Object.keys(run.files || {}).some(n => !files.some(f => f.name === n && f.content === run.files[n])) && (
                    <div className="c-files-out">
                      <div className="text-xs text-slate-400 mt-2">Files after the run:</div>
                      {Object.entries(run.files).filter(([n, c]) => !files.some(f => f.name === n && f.content === c)).map(([n, c]) => (
                        <details key={n}><summary>{n} ({c.length} bytes)</summary><pre>{c.slice(0, 4000)}</pre></details>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
