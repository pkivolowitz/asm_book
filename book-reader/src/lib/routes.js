// Lesson URLs.
//
// A lesson file "section_1/regs/ldr.md" is shown at /read/section_1/regs/ldr,
// and a folder's "README.md" at the folder: "section_1/if/README.md" is
// /read/section_1/if. Anchors are a real URL hash (#implementing-a-break).
//
// Older links used one encoded segment (/read/section_1%2Fkickstart.md) and
// still work: anything that ends in ".md" is taken as a file path as-is.

import manifest from '../manifest.json';

const KNOWN = new Set(manifest.flatMap(s => s.chapters.map(c => c.path.split('#')[0])));

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

// "section_1/if/README.md#x" -> "/read/section_1/if#x"
export function lessonUrl(filePath) {
  const [file, hash] = String(filePath).replace(/^\.?\//, '').split('#');
  let slug = file.replace(/\.md$/i, '');
  if (/(^|\/)README$/.test(slug)) slug = slug.replace(/\/?README$/, '') || 'README';
  return `/read/${encodePath(slug)}${hash ? `#${hash}` : ''}`;
}

// The lesson file(s) a /read/<slug> URL can mean, most likely first. The
// reader tries them in order, so files outside the manifest still resolve.
export function lessonCandidates(slug) {
  let s = String(slug || '').replace(/^\/+|\/+$/g, '');
  try { s = decodeURIComponent(s); } catch { /* malformed escape: use as typed */ }
  if (!s) return ['section_1/kickstart.md'];
  if (/\.md$/i.test(s)) return [s];
  const file = `${s}.md`;
  const readme = s === 'README' ? 'README.md' : `${s}/README.md`;
  if (KNOWN.has(file)) return [file, readme];
  if (KNOWN.has(readme)) return [readme, file];
  return [readme, file];
}

// True when the URL is an old-style link that should be rewritten.
export const isLegacyLessonUrl = (slug) => /%2f|%23|#|\.md$/i.test(slug || '');

export function chapterFor(filePath) {
  const file = String(filePath).split('#')[0];
  const all = manifest.flatMap(section => section.chapters.map(ch => ({ ...ch, sectionTitle: section.title })));
  // An anchored entry ("Implementing Break") wins over its file's plain entry.
  return all.find(ch => ch.path === filePath) || all.find(ch => ch.path.split('#')[0] === file) || null;
}
