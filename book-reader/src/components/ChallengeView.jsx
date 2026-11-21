import { useState, useEffect } from 'react';
import { getProgress, onProgressChange } from '../lib/progress';
import { 
  CheckCircle2, 
  HelpCircle, 
  Play, 
  Eye, 
  EyeOff, 
  ChevronRight,
  Code2
} from 'lucide-react';

export default function ChallengeView({ 
  exercises = [], 
  onOpenInSimulator = null 
}) {
  const [openHints, setOpenHints] = useState({});
  const [openSolutions, setOpenSolutions] = useState({});
  const [progress, setProgress] = useState(() => getProgress());
  useEffect(() => onProgressChange(setProgress), []);

  if (!exercises || exercises.length === 0) {
    return (
      <div className="exercises-section-empty">
        <div className="flex items-center gap-2 mb-2">
          <Code2 size={18} className="text-cyan-400" />
          <h3 className="text-base font-semibold text-slate-200 m-0">Hands-on Practice</h3>
        </div>
        <p className="text-sm text-slate-400 mb-3">
          Experiment with the concepts taught in this lesson directly in the ARM64 simulator.
        </p>
        <button 
          onClick={() => onOpenInSimulator && onOpenInSimulator(null, null)}
          className="cpulator-btn cpulator-btn-primary text-sm"
        >
          <Play size={14} />
          <span>Launch CPULator Simulator</span>
        </button>
      </div>
    );
  }

  const toggleHint = (id) => {
    setOpenHints(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSolution = (id) => {
    setOpenSolutions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="exercises-container">
      <div className="exercises-header">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={22} className="text-emerald-400" />
          <h2 className="exercises-title">Lesson Practice & Challenges</h2>
        </div>
        <span className="text-xs text-slate-400">
          {exercises.length} challenge{exercises.length > 1 ? 's' : ''} available
        </span>
      </div>

      <div className="exercises-list">
        {exercises.map((ex) => {
          const isHintOpen = !!openHints[ex.id];
          const isSolOpen = !!openSolutions[ex.id];

          return (
            <div key={ex.id} className="exercise-card">
              <div className="exercise-card-header">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`exercise-difficulty-badge diff-${ex.difficulty.toLowerCase()}`}>
                      {ex.difficulty}
                    </span>
                    <h3 className="exercise-card-title">{ex.title}</h3>
                    {progress.solved[ex.id] && <span className="solved-pill">✓ Solved</span>}
                  </div>
                  <p className="exercise-card-desc">{ex.description}</p>
                </div>

                <button 
                  onClick={() => onOpenInSimulator && onOpenInSimulator(ex.starterCode, ex)}
                  className="cpulator-btn cpulator-btn-action text-xs"
                >
                  <Play size={13} />
                  <span>Solve in CPULator</span>
                </button>
              </div>

              {/* Starter Code Preview */}
              <div className="exercise-starter-preview">
                <div className="starter-preview-label">Starter Template:</div>
                <pre className="starter-code-box">
                  <code>{ex.starterCode}</code>
                </pre>
              </div>

              {/* Hints & Solution Toggles */}
              <div className="exercise-footer-actions">
                {ex.hints && ex.hints.length > 0 && (
                  <button 
                    onClick={() => toggleHint(ex.id)}
                    className="exercise-toggle-btn"
                  >
                    <HelpCircle size={14} className="text-amber-400" />
                    <span>{isHintOpen ? 'Hide Hints' : `Show Hints (${ex.hints.length})`}</span>
                  </button>
                )}

                {ex.solutionCode && (
                  <button 
                    onClick={() => toggleSolution(ex.id)}
                    className="exercise-toggle-btn"
                  >
                    {isSolOpen ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{isSolOpen ? 'Hide Solution' : 'Reveal Solution'}</span>
                  </button>
                )}
              </div>

              {/* Hints Box */}
              {isHintOpen && (
                <div className="exercise-hints-box">
                  <div className="font-semibold text-xs text-amber-300 mb-1">Hints:</div>
                  <ul className="hints-list">
                    {ex.hints.map((hint, hIdx) => (
                      <li key={hIdx} className="flex items-start gap-1">
                        <ChevronRight size={13} className="text-amber-400 mt-1 shrink-0" />
                        <span>{hint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Solution Box */}
              {isSolOpen && (
                <div className="exercise-solution-box">
                  <div className="font-semibold text-xs text-emerald-300 mb-1">Official Solution:</div>
                  <pre className="solution-code-box">
                    <code>{ex.solutionCode}</code>
                  </pre>
                  <button 
                    onClick={() => onOpenInSimulator && onOpenInSimulator(ex.solutionCode, ex)}
                    className="cpulator-btn cpulator-btn-secondary text-xs mt-2"
                  >
                    <Play size={12} />
                    <span>Load Solution into CPULator</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
