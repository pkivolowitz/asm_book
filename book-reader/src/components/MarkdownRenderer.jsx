import { copyText } from '../lib/clipboard';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getExercisesForChapter } from '../data/lessonExercises';
import ChallengeView from './ChallengeView';
import CPULator from '../simulator/CPULator';
import CRunner from '../simulator/CRunner';
import manifest from '../manifest.json';
import { lessonUrl, chapterFor } from '../lib/routes';
import { splitCodeFiles } from '../lib/codeFiles';
import rehypeHeadingIds from '../lib/rehypeHeadingIds';
import { useTitle } from '../lib/useTitle';
import { setLastRead } from '../lib/progress';
import { C_LABS } from '../data/cLabs';
import { LEVELS } from '../data/levels';
import { 
  Play, 
  Copy, 
  Check, 
  Cpu, 
  Terminal, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize2 
} from 'lucide-react';

// `candidates`: the lesson files this URL can mean, most likely first (see
// lib/routes.js). `hash`: the anchor to scroll to, without '#'.
const MarkdownRenderer = ({ candidates, hash = null }) => {
  const [resolvedPath, setResolvedPath] = useState(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activePracticeModal, setActivePracticeModal] = useState(null); // null | { type: 'cpulator' | 'crunner', code, challenge }
  const navigate = useNavigate();

  const cleanPath = resolvedPath || candidates[0];
  const targetHash = hash || null;
  const path = targetHash ? `${cleanPath}#${targetHash}` : cleanPath;
  const candidateKey = candidates.join('|');
  const chapter = chapterFor(path);
  useTitle(error ? 'Lesson not found' : chapter ? chapter.title.replace(/`/g, '') : cleanPath.replace(/\.md$/, ''));

  // Flatten all chapters across sections for prev/next navigation
  const allChapters = manifest.flatMap(section => 
    section.chapters.map(ch => ({ ...ch, sectionTitle: section.title }))
  );
  const currentChapterIndex = allChapters.findIndex(ch => ch.path === path || ch.path === cleanPath);
  const prevChapter = currentChapterIndex > 0 ? allChapters[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex >= 0 && currentChapterIndex < allChapters.length - 1 
    ? allChapters[currentChapterIndex + 1] 
    : null;

  const exercises = getExercisesForChapter(cleanPath);

  useEffect(() => {
    // Ignore responses for a lesson the reader has already navigated away from.
    let cancelled = false;
    const controller = new AbortController();
    const fetchContent = async () => {
      try {
        setError(null);
        setContent('');
        // Try each file this URL can mean. Static hosts often answer unknown
        // paths with the SPA's index.html (200 OK), so that counts as missing.
        let text = null; let found = null; let lastStatus = 404;
        for (const candidate of candidateKey.split('|')) {
          const response = await fetch(`/content/${candidate}`, { signal: controller.signal });
          if (!response.ok) { lastStatus = response.status; continue; }
          const body = await response.text();
          if (/^\s*<!doctype html/i.test(body)) continue;
          text = body; found = candidate; break;
        }
        const first = candidateKey.split('|')[0];
        if (text == null) {
          throw new Error(lastStatus === 404 ? `Lesson not found: ${first}` : `Failed to load ${first} (HTTP ${lastStatus})`);
        }
        if (cancelled) return;
        setResolvedPath(found);
        setLastRead(found);
        setContent(text);

        if (targetHash) {
          setTimeout(() => {
            const el = document.getElementById(targetHash);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        } else {
          window.scrollTo(0, 0);
        }
      } catch (err) {
        if (cancelled || err.name === 'AbortError') return;
        setError(err.message);
      }
    };
    fetchContent();
    return () => { cancelled = true; controller.abort(); };
  }, [candidateKey, targetHash]);

  // Resolve relative paths for images and internal markdown links
  const resolvePath = (src) => {
    if (!src) return '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('#')) return src;
    // A leading slash means "relative to the repository root".
    const dir = src.startsWith('/') ? '' : cleanPath.substring(0, cleanPath.lastIndexOf('/'));
    const parts = dir ? dir.split('/') : [];
    const srcParts = src.split('/');

    for (const part of srcParts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        parts.pop();
      } else {
        parts.push(part);
      }
    }
    return parts.join('/');
  };

  const handleCopyCode = (codeText, idx) => {
    copyText(codeText);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // `key` forces a fresh simulator each time, so opening a different snippet
  // never shows the previous one's code or state.
  const handleOpenSimulator = (starterCode = null, challenge = null) => {
    setActivePracticeModal({
      type: 'cpulator',
      code: starterCode,
      challenge: challenge,
      key: Date.now()
    });
  };

  const handleOpenCRunner = (code = null) => {
    setActivePracticeModal({
      type: 'crunner',
      code: code,
      key: Date.now()
    });
  };

  // Escape closes the practice drawer.
  useEffect(() => {
    if (!activePracticeModal) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setActivePracticeModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePracticeModal]);

  if (error) {
    return (
      <div className="error-card">
        <h3>Unable to load lesson content</h3>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="cpulator-btn cpulator-btn-primary mt-4"
        >
          Back to the home page
        </button>
      </div>
    );
  }

  if (!content) return <div className="loading">Loading lesson content...</div>;

  let codeBlockCounter = 0;

  return (
    <div className="reader-wrapper">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="reader-breadcrumb-bar">
        <div className="breadcrumb-path">
          <span className="text-slate-400">Lesson: </span>
          <strong className="text-slate-200">
            {allChapters[currentChapterIndex]?.title || cleanPath}
          </strong>
        </div>

        <div className="flex items-center gap-2">
          {exercises.length > 0 && (
            <button 
              onClick={() => handleOpenSimulator(exercises[0].starterCode, exercises[0])}
              className="breadcrumb-action-btn btn-action-sim"
            >
              <Cpu size={14} />
              <span>Practice in CPULator</span>
            </button>
          )}

          {cleanPath.startsWith('c_course') && (
            <button 
              onClick={() => handleOpenCRunner(null)}
              className="breadcrumb-action-btn btn-action-c"
            >
              <Terminal size={14} />
              <span>Open C Sandbox</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Markdown Article */}
      <article className="prose">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeHeadingIds]}
          components={{
            code({ inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const lang = match ? match[1].toLowerCase() : '';
              const codeText = String(children).replace(/\n$/, '');
              const blockId = codeBlockCounter++;

              if (!inline && match) {
                const isAsm = ['s', 'asm', 'arm64', 'assembly'].includes(lang);
                const isC = ['c', 'cpp', 'h'].includes(lang);

                return (
                  <div className="code-block-container">
                    <div className="code-block-header">
                      <div className="flex items-center gap-2">
                        {isAsm && <Cpu size={14} className="text-cyan-400" />}
                        {isC && <Terminal size={14} className="text-amber-400" />}
                        <span className="code-block-lang">
                          {isAsm ? 'ARM64 Assembly' : isC ? (() => { const p = splitCodeFiles(codeText); return p ? `C project · ${p.map(f => f.name).join(', ')}` : 'C / C++'; })() : lang.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAsm && (
                          <button 
                            onClick={() => handleOpenSimulator(codeText, null)}
                            className="code-action-btn btn-run-asm"
                            title="Open snippet in CPULator simulator"
                          >
                            <Play size={12} />
                            <span>Run in CPULator</span>
                          </button>
                        )}

                        {isC && (
                          <button 
                            onClick={() => handleOpenCRunner(codeText)}
                            className="code-action-btn btn-run-c"
                            title="Run snippet in C sandbox"
                          >
                            <Play size={12} />
                            <span>Run in C Sandbox</span>
                          </button>
                        )}

                        <button 
                          onClick={() => handleCopyCode(codeText, blockId)}
                          className="code-action-btn"
                          title="Copy code"
                        >
                          {copiedIndex === blockId ? (
                            <>
                              <Check size={12} className="text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <SyntaxHighlighter
                      style={atomDark}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {codeText}
                    </SyntaxHighlighter>
                  </div>
                );
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            img({ src, alt, ...props }) {
              const resolved = resolvePath(src);
              const finalSrc = /^[a-z][a-z0-9+.-]*:/i.test(resolved) ? resolved : `/content/${resolved}`;
              return <img src={finalSrc} alt={alt || ''} loading="lazy" {...props} />;
            },
            a({ href, children, ...props }) {
              if (!href) return children;

              // Handle anchor hashes on same page
              if (href.startsWith('#')) {
                return (
                  <a 
                    href={href} 
                    onClick={(e) => {
                      e.preventDefault();
                      const target = document.getElementById(href.slice(1));
                      if (target) target.scrollIntoView({ behavior: 'smooth' });
                    }}
                    {...props}
                  >
                    {children}
                  </a>
                );
              }

              const isExternal = /^[a-z][a-z0-9+.-]*:/i.test(href);
              // Links to the app's own tools (e.g. "/practice") from lesson text.
              if (/^\/(practice|simulator|c-sandbox)(\?|$)/.test(href)) {
                return <Link to={href} className="internal-reader-link" {...props}>{children}</Link>;
              }
              if (!isExternal) {
                const [hrefPath, hrefHash] = href.split('#');
                let cleanTarget = resolvePath(hrefPath).replace(/\/$/, '');
                const lastSeg = cleanTarget.split('/').pop() || '';
                const hasExt = /\.[A-Za-z0-9]+$/.test(lastSeg);
                // Source files, PDFs, images: open the raw file rather than the reader.
                if (hasExt && !cleanTarget.endsWith('.md')) {
                  return <a href={`/content/${cleanTarget}`} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                }
                if (!hasExt) cleanTarget = cleanTarget ? `${cleanTarget}/README.md` : 'README.md';
                if (hrefHash) cleanTarget = `${cleanTarget}#${hrefHash}`;
                return (
                  <Link to={lessonUrl(cleanTarget)} className="internal-reader-link" {...props}>
                    {children}
                  </Link>
                );
              }

              return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </article>

      {/* Interactive Exercises Section for this Lesson */}
      <ChallengeView 
        key={cleanPath}
        exercises={exercises} 
        onOpenInSimulator={handleOpenSimulator} 
      />

      {/* Graded practice that belongs to this chapter */}
      {(() => {
        const related = [...LEVELS.map(l => ({ ...l, track: 'arm64' })), ...C_LABS.map(l => ({ ...l, track: 'c' }))].filter(l => l.reference === cleanPath);
        if (!related.length) return null;
        return (
          <section className="chapter-labs">
            <h3>Graded practice for this chapter</h3>
            <ul>
              {related.map(l => (
                <li key={l.id}>
                  <Link className="internal-reader-link" to={`/practice?${l.track === 'c' ? 'track=c&' : ''}level=${l.id}`}>{l.title}</Link>
                  <span className="text-xs text-slate-400"> · {l.track === 'c' ? 'C lab' : 'ARM64 level'} · {l.difficulty}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {/* Prev / Next Chapter Navigation Footer */}
      <footer className="chapter-nav-footer">
        {prevChapter ? (
          <Link to={lessonUrl(prevChapter.path)} className="chapter-nav-btn nav-prev">
            <ChevronLeft size={20} />
            <div className="nav-text-col">
              <span className="nav-label">Previous Lesson</span>
              <span className="nav-title">{prevChapter.title}</span>
            </div>
          </Link>
        ) : <div />}

        {nextChapter && (
          <Link to={lessonUrl(nextChapter.path)} className="chapter-nav-btn nav-next">
            <div className="nav-text-col text-right">
              <span className="nav-label">Next Lesson</span>
              <span className="nav-title">{nextChapter.title}</span>
            </div>
            <ChevronRight size={20} />
          </Link>
        )}
      </footer>

      {/* Interactive Practice Slide-Out Modal Drawer */}
      {activePracticeModal && (
        <div className="practice-modal-backdrop">
          <div className="practice-modal-container">
            <div className="practice-modal-header">
              <div className="flex items-center gap-2">
                {activePracticeModal.type === 'cpulator' ? (
                  <>
                    <Cpu size={18} className="text-cyan-400" />
                    <strong>CPULator Interactive Simulator</strong>
                  </>
                ) : (
                  <>
                    <Terminal size={18} className="text-amber-400" />
                    <strong>C Systems Sandbox & Disassembler</strong>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activePracticeModal.type === 'cpulator' && (
                  <button 
                    onClick={() => {
                      const code = activePracticeModal.code;
                      setActivePracticeModal(null);
                      navigate('/simulator', { state: { code } });
                    }}
                    className="modal-tool-btn"
                    title="Open Fullscreen Simulator"
                  >
                    <Maximize2 size={15} />
                    <span>Full Screen</span>
                  </button>
                )}

                <button 
                  onClick={() => setActivePracticeModal(null)}
                  className="modal-tool-btn"
                  title="Close practice window"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="practice-modal-body">
              {activePracticeModal.type === 'cpulator' ? (
                <CPULator
                  key={activePracticeModal.key}
                  initialCode={activePracticeModal.code}
                  challenge={activePracticeModal.challenge}
                />
              ) : (
                <CRunner
                  key={activePracticeModal.key}
                  initialCode={activePracticeModal.code}
                  onLoadAsmInCpulator={(asmCode) => {
                    setActivePracticeModal({
                      type: 'cpulator',
                      code: asmCode,
                      key: Date.now()
                    });
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownRenderer;
