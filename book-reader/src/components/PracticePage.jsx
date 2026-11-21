import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Flame, CheckCircle2, Circle, Target, RotateCcw, Download, Upload, BookOpen, HelpCircle, Eye } from 'lucide-react';
import CPULator from '../simulator/CPULator';
import CRunner from '../simulator/CRunner';
import { LEVELS } from '../data/levels';
import { C_LABS } from '../data/cLabs';
import { getProgress, onProgressChange, streak, localDay, exportProgress, importProgress } from '../lib/progress';

// Deterministic per-day pick so "today's review" is stable across reloads.
function dayHash(day) {
  let h = 2166136261;
  for (const c of day) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export default function PracticePage() {
  const [progress, setProgress] = useState(() => getProgress());
  const [params, setParams] = useSearchParams();
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => onProgressChange(setProgress), []);

  const solved = progress.solved;
  const track = params.get('track') === 'c' ? 'c' : 'arm64';
  const ITEMS = track === 'c' ? C_LABS : LEVELS;
  const nextLevel = ITEMS.find(l => !solved[l.id]) || null;
  const today = localDay();
  const review = useMemo(() => {
    const done = [...LEVELS, ...C_LABS].filter(l => solved[l.id] && solved[l.id].last !== today);
    return done.length ? done[dayHash(today) % done.length] : null;
  }, [solved, today]);

  const selectedId = params.get('level') || nextLevel?.id || ITEMS[0].id;
  const level = ITEMS.find(l => l.id === selectedId) || ITEMS[0];
  const solvedCount = ITEMS.filter(l => solved[l.id]).length;
  const trackOf = (id) => (C_LABS.some(l => l.id === id) ? 'c' : 'arm64');
  const doneToday = progress.days[today] || 0;
  const currentStreak = streak(progress);

  const select = (id) => {
    const t = trackOf(id);
    setParams(t === 'c' ? { track: 'c', level: id } : { level: id });
    setShowHints(false); setShowSolution(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExport = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lowlevel-lab-progress-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(t => { importProgress(t); setMsg('Progress imported.'); }).catch(err => setMsg(`Import failed: ${err.message}`));
    e.target.value = '';
  };

  return (
    <div className="practice-page">
      <div className="practice-hero">
        <div>
          <h2>Daily practice</h2>
          <p>
            One level a day keeps the instruction set in your fingers. Each level is graded against several
            generated inputs, so it only passes when the code is correct in general. Progress is saved in this browser.
          </p>
        </div>
        <div className="practice-stats">
          <div className="stat-tile"><Flame size={18} className="text-amber-400" /><strong>{currentStreak}</strong><span>day streak</span></div>
          <div className="stat-tile"><CheckCircle2 size={18} className="text-emerald-400" /><strong>{solvedCount}/{ITEMS.length}</strong><span>{track === 'c' ? 'C labs' : 'ARM64 levels'}</span></div>
          <div className="stat-tile"><Target size={18} className="text-cyan-400" /><strong>{doneToday}</strong><span>solved today</span></div>
        </div>
      </div>

      <div className="track-switch" role="tablist" aria-label="Practice track">
        <button role="tab" aria-selected={track === 'arm64'} className={track === 'arm64' ? 'track-active' : ''} onClick={() => setParams({})}>ARM64 Foundations ({LEVELS.filter(l => solved[l.id]).length}/{LEVELS.length})</button>
        <button role="tab" aria-selected={track === 'c'} className={track === 'c' ? 'track-active' : ''} onClick={() => setParams({ track: 'c' })}>C for Systems ({C_LABS.filter(l => solved[l.id]).length}/{C_LABS.length})</button>
      </div>

      <div className="daily-cards">
        {nextLevel ? (
          <button className="daily-card" onClick={() => select(nextLevel.id)}>
            <span className="daily-label">Today: next level</span>
            <strong>{nextLevel.title}</strong>
            <span className="daily-sub">{nextLevel.concept}</span>
          </button>
        ) : (
          <div className="daily-card done"><span className="daily-label">Track complete</span><strong>All {ITEMS.length} solved</strong><span className="daily-sub">Keep the streak with daily reviews, then move to the mobile roadmap.</span></div>
        )}
        {review && (
          <button className="daily-card review" onClick={() => select(review.id)}>
            <span className="daily-label"><RotateCcw size={12} /> Today: review from memory</span>
            <strong>{review.title}</strong>
            <span className="daily-sub">Clear the editor and solve it again without hints.</span>
          </button>
        )}
        <Link className="daily-card roadmap" to={`/read/${encodeURIComponent('section_6_mobile/README.md')}`}>
          <span className="daily-label"><BookOpen size={12} /> Where this leads</span>
          <strong>Mobile security roadmap</strong>
          <span className="daily-sub">ARM64 → Android/iOS internals → fuzzing → kernel</span>
        </Link>
      </div>

      <div className="practice-layout">
        <nav className="level-list" aria-label="Levels">
          {ITEMS.map((l, i) => (
            <button key={l.id} className={`level-item ${l.id === level.id ? 'level-active' : ''}`} onClick={() => select(l.id)}>
              {solved[l.id] ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> : <Circle size={14} className="text-slate-500 shrink-0" />}
              <span className="level-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="level-title">{l.title}</span>
            </button>
          ))}
          <div className="level-list-actions">
            <button onClick={handleExport} className="editor-header-btn"><Download size={13} /><span>Export</span></button>
            <label className="editor-header-btn" style={{ cursor: 'pointer' }}>
              <Upload size={13} /><span>Import</span>
              <input type="file" accept="application/json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
          </div>
          {msg && <p className="text-xs text-slate-400 mt-2">{msg}</p>}
          <p className="text-xs text-slate-500 mt-2">Progress lives in this browser only. Export it to move devices or before clearing site data.</p>
        </nav>

        <section className="level-detail">
          <div className="level-header">
            <span className={`exercise-difficulty-badge diff-${level.difficulty.toLowerCase()}`}>{level.difficulty}</span>
            <h3>{level.title}</h3>
            {solved[level.id] && <span className="solved-pill">Solved {solved[level.id].count}×</span>}
          </div>
          <p className="level-desc">{level.description}</p>
          <div className="level-meta">
            <span>Concept: <strong>{level.concept}</strong></span>
            {level.reference && (
              <Link to={`/read/${encodeURIComponent(level.reference)}`} className="internal-reader-link">Read the chapter</Link>
            )}
          </div>
          <div className="exercise-footer-actions">
            {level.hints?.length > 0 && (
              <button onClick={() => setShowHints(h => !h)} className="exercise-toggle-btn"><HelpCircle size={14} className="text-amber-400" /><span>{showHints ? 'Hide hints' : `Hints (${level.hints.length})`}</span></button>
            )}
            <button onClick={() => { if (showSolution || window.confirm('Reveal the reference solution? Try for a while first - struggling is where the learning happens.')) setShowSolution(s => !s); }} className="exercise-toggle-btn">
              <Eye size={14} /><span>{showSolution ? 'Hide solution' : 'Solution'}</span>
            </button>
          </div>
          {showHints && <ul className="exercise-hints-box hints-list">{level.hints.map((h, i) => <li key={i}>{h}</li>)}</ul>}
          {showSolution && (
            <pre className="solution-code-box exercise-solution-box">
              {level.solutionCode ?? Object.entries(level.solution).map(([n, c]) => `// ===== ${n} =====\n${c}`).join('\n')}
            </pre>
          )}

          {track === 'c'
            ? <CRunner key={level.id} lab={level} />
            : <CPULator key={level.id} initialCode={level.starterCode} challenge={level} />}
        </section>
      </div>
    </div>
  );
}
