import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MarkdownRenderer from './components/MarkdownRenderer';
import CPULator from './simulator/CPULator';
import CRunner from './simulator/CRunner';
import PracticePage from './components/PracticePage';
import { Menu, X, Cpu } from 'lucide-react';

const ReaderView = () => {
  const { '*': path } = useParams();
  let decoded = path || '';
  try { decoded = decodeURIComponent(decoded); } catch { /* malformed %-escape in a hand-typed URL */ }
  // key: remount per lesson so per-page state (modals, toggles) never leaks across lessons
  return <MarkdownRenderer key={decoded} path={decoded} />;
};

// Full-screen simulator; "Full Screen" from a lesson passes its code along.
const SimulatorView = () => {
  const location = useLocation();
  const code = location.state?.code || null;
  return <CPULator key={location.key} initialCode={code} />;
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <Router>
      <div className="mobile-header">
        <div className="sidebar-title flex items-center gap-2" style={{ marginBottom: 0 }}>
          <Cpu size={20} className="text-cyan-400" />
          <span>Low-Level Lab</span>
        </div>
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
          <Route path="/" element={<Navigate to="/read/section_1%2Fkickstart.md" replace />} />
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
              <CRunner />
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
