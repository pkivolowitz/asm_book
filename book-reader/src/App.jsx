import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useParams, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MarkdownRenderer from './components/MarkdownRenderer';
import CPULator from './simulator/CPULator';
import CRunner from './simulator/CRunner';
import PracticePage from './components/PracticePage';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import { lessonUrl, lessonCandidates, isLegacyLessonUrl } from './lib/routes';
import { useTitle } from './lib/useTitle';
import { Menu, X, Cpu } from 'lucide-react';

const ReaderView = () => {
  const { '*': slug } = useParams();
  const location = useLocation();
  // Old links (/read/section_1%2Fkickstart.md, with the anchor encoded in the
  // path) are rewritten to the clean form so shared links stay consistent.
  if (isLegacyLessonUrl(slug)) {
    let file = slug || '';
    try { file = decodeURIComponent(file); } catch { /* malformed escape: use as typed */ }
    const [path, anchor] = file.split('#');
    const hash = location.hash || (anchor ? `#${anchor}` : '');
    const target = lessonUrl(path).split('#')[0] + hash;
    if (target !== location.pathname + location.hash) return <Navigate to={target} replace />;
  }
  const candidates = lessonCandidates(slug);
  let hash = location.hash ? location.hash.slice(1) : null;
  try { if (hash) hash = decodeURIComponent(hash); } catch { /* keep as typed */ }
  // key: remount per lesson so per-page state (modals, toggles) never leaks across lessons
  return <MarkdownRenderer key={candidates[0]} candidates={candidates} hash={hash} />;
};

// Full-screen simulator; "Full Screen" from a lesson passes its code along.
const SimulatorView = () => {
  const location = useLocation();
  const code = location.state?.code || null;
  useTitle('ARM64 simulator');
  return <CPULator key={location.key} initialCode={code} />;
};

const CSandboxView = () => {
  useTitle('C sandbox');
  return <CRunner />;
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <Router>
      <div className="mobile-header">
        <Link to="/" className="sidebar-title sidebar-home-link flex items-center gap-2" style={{ marginBottom: 0 }} onClick={() => setIsSidebarOpen(false)}>
          <Cpu size={20} className="text-cyan-400" />
          <span>Low-Level Lab</span>
        </Link>
        <button 
          onClick={toggleSidebar}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          aria-label="Toggle Navigation Menu"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/read/*" element={<ReaderView />} />
          <Route path="/simulator" element={
            <div className="full-tool-wrapper">
              <div className="tool-intro-header">
                <h2>⚡ ARM64 CPULator Simulator & Debugger</h2>
                <p>Interactive AArch64 execution engine, step-debugging, 64-bit registers (X0-X30, SP, PC), NZCV condition flags, memory inspector, and Linux syscall console.</p>
              </div>
              <SimulatorView />
            </div>
          } />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/c-sandbox" element={
            <div className="full-tool-wrapper">
              <div className="tool-intro-header">
                <h2>💻 C Systems Sandbox & Disassembler</h2>
                <p>Run C code, experiment with pointers and memory representation, and view compiled ARM64 disassembly output.</p>
              </div>
              <CSandboxView />
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
