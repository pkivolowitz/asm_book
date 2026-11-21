import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Target, Terminal, Smartphone, Play, RotateCcw, Flame, ArrowRight, Cpu, ShieldCheck, HardDrive, MonitorSmartphone } from 'lucide-react';
import manifest from '../manifest.json';
import { LEVELS } from '../data/levels';
import { C_LABS } from '../data/cLabs';
import { HOME_DEMO } from '../data/homeDemo';
import { ARM64Simulator } from '../simulator/arm64Engine';
import { getProgress, onProgressChange, streak } from '../lib/progress';
import { lessonUrl, chapterFor } from '../lib/routes';
import { useTitle } from '../lib/useTitle';

const DEMO_MAX_STEPS = 200000;

// Assemble and run the demo from scratch. Every outcome a visitor can cause by
// editing (assembler error, crash, endless loop) becomes a readable message.
function runDemo(code) {
  const sim = new ARM64Simulator({});
  const asm = sim.assemble(code);
  if (!asm.success) return { kind: 'error', text: `Assembler error. ${asm.error}` };
  let res;
  try { res = sim.run(DEMO_MAX_STEPS, { ignoreBreakpoints: true }); } catch (err) { return { kind: 'error', text: String(err.message || err) }; }
  const out = sim.stdout + sim.stderr;
  const steps = `${sim.cycleCount.toLocaleString()} instructions`;
  if (res.status === 'timeout') {
    return { kind: 'error', text: `${out}Stopped after ${steps}: the program never exited. (With a count of 0, subs wraps x19 around to 2^64 - 1, so the loop runs almost forever.)` };
  }
  if (sim.fault) return { kind: 'error', text: `${out}Crashed: ${sim.lastError}` };
  if (!sim.isTerminated) return { kind: 'error', text: `${out}${res.message || 'The program did not exit.'}` };
  return { kind: 'ok', text: out || '(no output)', meta: `exit status ${sim.exitCode} · ${steps}` };
}

const lessonCount = manifest.reduce((n, s) => n + s.chapters.filter(c => !c.path.includes('#')).length, 0);

const PATHS = [
  {
    icon: BookOpen, title: 'New to assembly? Start reading',
    text: 'The book starts from C you already know and shows the ARM64 it becomes, one idea at a time. Every example runs right in the page.',
    to: lessonUrl('section_1/kickstart.md'), cta: 'Start with Section 1',
  },
  {
    icon: Target, title: 'Practice a little every day',
    text: `${LEVELS.length} graded ARM64 levels, from setting one register to reversing a crackme. Each is checked against inputs you cannot guess, so hard-coding the answer does not pass.`,
    to: '/practice', cta: 'Try the first level',
  },
  {
    icon: Terminal, title: 'Learn C the way systems people use it',
    text: `${C_LABS.length} C labs on pointers, heap ownership, files and untrusted input. A real compiler turns your C into ARM64, and a heap checker reports bugs at the line that caused them.`,
    to: '/practice?track=c', cta: 'Open the C labs',
  },
  {
    icon: Smartphone, title: 'Heading for mobile security',
    text: 'A roadmap from ARM64 and C to Android native code, mitigations, fuzzing and the kernel, with what to be able to do before each step.',
    to: lessonUrl('section_6_mobile/README.md'), cta: 'Read the roadmap',
  },
];

const HomePage = () => {
  useTitle(null);
  const [progress, setProgress] = useState(() => getProgress());
  useEffect(() => onProgressChange(setProgress), []);
  const [code, setCode] = useState(HOME_DEMO);
  const [result, setResult] = useState(null);

  const solvedCount = Object.keys(progress.solved || {}).length;
  const currentStreak = streak(progress);
  const last = progress.lastRead ? chapterFor(progress.lastRead) : null;
  const returning = !!(progress.lastRead || solvedCount);

  return (
    <div className="home">
      <section className="home-hero">
        <p className="home-kicker"><Cpu size={16} /> Low-Level Lab</p>
        <h1>Learn ARM64 assembly and C by running real code in your browser.</h1>
        <p className="home-lede">
          A free, open book plus a practice lab, for people who want to read disassembly,
          understand memory bugs and work toward mobile security research.
          Nothing to install and no account needed.
        </p>
        <div className="home-cta-row">
          <Link className="home-btn home-btn-primary" to={lessonUrl('section_1/kickstart.md')}>Start reading <ArrowRight size={16} /></Link>
          <Link className="home-btn" to="/practice">Daily practice</Link>
          <a className="home-btn home-btn-ghost" href="#try-it">Try it below</a>
        </div>
      </section>

      {returning && (
        <section className="home-resume" aria-label="Your progress">
          {progress.lastRead && (
            <Link className="home-resume-card" to={lessonUrl(progress.lastRead)}>
              <span className="home-resume-label">Continue reading</span>
              <span className="home-resume-title">{last ? last.title.replace(/`/g, '') : progress.lastRead}</span>
              {last && <span className="home-resume-sub">{last.sectionTitle}</span>}
            </Link>
          )}
          <Link className="home-resume-card" to="/practice">
            <span className="home-resume-label">Practice</span>
            <span className="home-resume-title"><Flame size={16} className="home-flame" /> {currentStreak} day streak</span>
            <span className="home-resume-sub">{solvedCount} of {LEVELS.length + C_LABS.length} levels and labs solved</span>
          </Link>
        </section>
      )}

      <section className="home-paths" aria-label="Where to start">
        {PATHS.map(p => (
          <Link key={p.title} to={p.to} className="home-path">
            <p.icon size={22} className="home-path-icon" />
            <h2>{p.title}</h2>
            <p>{p.text}</p>
            <span className="home-path-cta">{p.cta} <ArrowRight size={14} /></span>
          </Link>
        ))}
      </section>

      <section className="home-demo" id="try-it">
        <div className="home-demo-head">
          <h2>Try it: your first ARM64 program</h2>
          <p>This calls the Linux <code>write</code> system call in a loop. Change the text or the count and press Run.</p>
        </div>
        <textarea
          className="home-demo-editor"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); setResult(runDemo(code)); } }}
          spellCheck={false}
          rows={HOME_DEMO.split('\n').length}
          aria-label="ARM64 assembly program"
        />
        <div className="home-demo-actions">
          <button type="button" className="home-btn home-btn-primary" onClick={() => setResult(runDemo(code))}><Play size={16} /> Run</button>
          <button type="button" className="home-btn home-btn-ghost" onClick={() => { setCode(HOME_DEMO); setResult(null); }}><RotateCcw size={16} /> Reset</button>
          <Link className="home-demo-more" to="/simulator" state={{ code }}>Step through it in the debugger <ArrowRight size={14} /></Link>
        </div>
        {result && (
          <div className={`home-demo-output ${result.kind === 'error' ? 'is-error' : ''}`} role="status">
            <pre>{result.text}</pre>
            {result.meta && <span className="home-demo-meta">{result.meta}</span>}
          </div>
        )}
      </section>

      <section className="home-facts" aria-label="How the lab works">
        <div><MonitorSmartphone size={18} /><p><strong>Runs in your browser.</strong> The ARM64 simulator, the C compiler and the graders all run on your device. No code is sent to a server.</p></div>
        <div><HardDrive size={18} /><p><strong>Your progress stays with you.</strong> It is saved in this browser only and never sent anywhere. Use Export on the Practice page to move it.</p></div>
        <div><ShieldCheck size={18} /><p><strong>Security topics, used responsibly.</strong> The exploitation and mobile chapters are for your own code, devices and training targets.</p></div>
      </section>

      <footer className="home-footer">
        <span>{lessonCount} lessons · {LEVELS.length} ARM64 levels · {C_LABS.length} C labs</span>
        <span>
          Book by Perry Kivolowitz, <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-NC-SA 4.0</a>.{' '}
          <Link to="/about">About, credits and privacy</Link>
        </span>
      </footer>
    </div>
  );
};

export default HomePage;
