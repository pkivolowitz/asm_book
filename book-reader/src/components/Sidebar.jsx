import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import manifest from '../manifest.json';
import { LESSON_EXERCISES } from '../data/lessonExercises';
import { Search, BookOpen, Cpu, Terminal, Sparkles, FolderGit2, Flame, Smartphone } from 'lucide-react';
import { getProgress, onProgressChange, streak } from '../lib/progress';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'asm' | 'c' | 'projects'
  const [searchQuery, setSearchQuery] = useState('');
  const [progress, setProgress] = useState(() => getProgress());
  useEffect(() => onProgressChange(setProgress), []);
  const currentStreak = streak(progress);

  // Filter sections based on course category
  const filteredSections = manifest.filter(section => {
    if (filter === 'asm') {
      return section.title.startsWith('Section') && !section.title.includes('Mobile');
    }
    if (filter === 'mobile') {
      return section.title.includes('Mobile') || section.title.includes('Exploitation');
    }
    if (filter === 'c') {
      return section.title.includes('C for Systems');
    }
    if (filter === 'projects') {
      return section.title === 'Projects';
    }
    return true;
  }).map(section => {
    if (!searchQuery.trim()) return section;
    const filteredChapters = section.chapters.filter(ch => 
      ch.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    return {
      ...section,
      chapters: filteredChapters
    };
  }).filter(section => section.chapters.length > 0);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Title */}
      <div className="sidebar-brand-wrapper">
        <div className="sidebar-title flex items-center gap-2">
          <Cpu className="text-cyan-400" size={22} />
          <span>Low-Level Lab</span>
        </div>
        <span className="sidebar-version-badge">ARM64 + C</span>
      </div>

      {/* Direct Tool Links */}
      <div className="sidebar-tools-nav">
        <NavLink 
          to="/practice" 
          className={({ isActive }) => `sidebar-tool-btn ${isActive ? 'tool-active' : ''}`}
          onClick={() => { if (window.innerWidth <= 1024) toggleSidebar(); }}
        >
          <Flame size={16} className="text-amber-400" />
          <span>Daily Practice</span>
          <span className="tool-pill" title="Day streak">{currentStreak}🔥</span>
        </NavLink>
        <NavLink 
          to="/simulator" 
          className={({ isActive }) => `sidebar-tool-btn ${isActive ? 'tool-active' : ''}`}
          onClick={() => { if (window.innerWidth <= 1024) toggleSidebar(); }}
        >
          <Cpu size={16} className="text-cyan-400" />
          <span>ARM64 CPULator</span>
          <span className="tool-pill">Sim</span>
        </NavLink>
        <NavLink 
          to="/c-sandbox" 
          className={({ isActive }) => `sidebar-tool-btn ${isActive ? 'tool-active' : ''}`}
          onClick={() => { if (window.innerWidth <= 1024) toggleSidebar(); }}
        >
          <Terminal size={16} className="text-amber-400" />
          <span>C Systems Sandbox</span>
          <span className="tool-pill pill-c">C</span>
        </NavLink>
      </div>

      {/* Course Filter Pills */}
      <div className="sidebar-filter-pills">
        <button 
          className={`filter-pill ${filter === 'all' ? 'pill-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-pill ${filter === 'asm' ? 'pill-active' : ''}`}
          onClick={() => setFilter('asm')}
        >
          <BookOpen size={12} className="inline mr-1" />
          Assembly
        </button>
        <button 
          className={`filter-pill ${filter === 'c' ? 'pill-active' : ''}`}
          onClick={() => setFilter('c')}
        >
          <Sparkles size={12} className="inline mr-1" />
          C Course
        </button>
        <button 
          className={`filter-pill ${filter === 'mobile' ? 'pill-active' : ''}`}
          onClick={() => setFilter('mobile')}
        >
          <Smartphone size={12} className="inline mr-1" />
          Mobile
        </button>
        <button 
          className={`filter-pill ${filter === 'projects' ? 'pill-active' : ''}`}
          onClick={() => setFilter('projects')}
        >
          <FolderGit2 size={12} className="inline mr-1" />
          Projects
        </button>
      </div>

      {/* Search Input */}
      <div className="sidebar-search-box">
        <Search size={14} className="text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter chapters..."
          className="sidebar-search-input"
        />
      </div>

      {/* Section List */}
      {filteredSections.map((section, idx) => (
        <div key={idx} className="sidebar-section">
          <div className="sidebar-section-title">{section.title}</div>
          {section.chapters.map((chapter) => {
            const cleanPath = chapter.path.split('#')[0].replace(/^\.\//, '');
            const lessonEx = LESSON_EXERCISES[cleanPath] || [];
            const hasExercises = lessonEx.length > 0;
            const allSolved = hasExercises && lessonEx.every(ex => progress.solved[ex.id]);

            return (
              <NavLink
                key={`${chapter.id}-${chapter.path}`}
                to={`/read/${encodeURIComponent(chapter.path)}`}
                className={({ isActive }) => 
                  `sidebar-item ${isActive ? 'active' : ''}`
                }
                onClick={() => {
                  if (window.innerWidth <= 1024) toggleSidebar();
                }}
              >
                <span className="chapter-item-title">{chapter.title}</span>
                {hasExercises && (allSolved ? (
                  <span className="chapter-solved-indicator" title="All exercises solved">✓</span>
                ) : (
                  <span className="chapter-exercise-indicator" title="Practice exercises available">★</span>
                ))}
              </NavLink>
            );
          })}
        </div>
      ))}
    </aside>
  );
};

export default Sidebar;
