import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The lesson markdown lives in the repository root (one level above this
// app). It used to be exposed through symlinks in public/content, but git on
// Windows checks symlinks out as tiny text files (core.symlinks=false), which
// made every lesson fail to load. This plugin serves the repo content directly
// in dev and copies it into dist/ at build time, so no symlinks are needed.

const APP_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(APP_DIR, '..')

const CONTENT_DIRS = [
  'section_1', 'section_2', 'section_3', 'section_5_exploitation',
  'section_6_mobile', 'more', 'projects', 'macros', 'python', 'c_course',
  'reference_material', 'debugging', // PDFs/slides: served in dev, not copied into builds (size)
]
const CONTENT_FILES = ['README.md', 'not_written_yet.md']

// Only web-viewable files get copied into the production build. PDFs and
// .pptx files are large and not rendered by the reader.
const COPY_EXT = new Set([
  '.md', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.s', '.S', '.c', '.cpp', '.h', '.py', '.txt',
])

const MIME = {
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
}

function resolveContentPath(urlPath) {
  let rel
  try {
    rel = decodeURIComponent(urlPath.replace(/^\/content\//, '').split('?')[0])
  } catch {
    return null
  }
  const top = rel.split('/')[0]
  if (!CONTENT_DIRS.includes(top) && !CONTENT_FILES.includes(rel)) return null
  const abs = path.resolve(REPO_ROOT, rel)
  // Block path traversal outside the repo root.
  if (!abs.startsWith(REPO_ROOT + path.sep)) return null
  return abs
}

function copyTree(src, dest) {
  if (!fs.existsSync(src)) return 0
  let n = 0
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      n += copyTree(s, d)
    } else if (COPY_EXT.has(path.extname(entry.name))) {
      fs.mkdirSync(path.dirname(d), { recursive: true })
      fs.copyFileSync(s, d)
      n++
    }
  }
  return n
}

function bookContent() {
  let outDir = 'dist'
  return {
    name: 'book-content',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/content/')) return next()
        const abs = resolveContentPath(req.url)
        if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
          res.statusCode = 404
          res.end('Not found')
          return
        }
        res.setHeader('Content-Type', MIME[path.extname(abs)] || 'text/plain; charset=utf-8')
        fs.createReadStream(abs).pipe(res)
      })
    },
    closeBundle() {
      const dest = path.join(outDir, 'content')
      let n = 0
      for (const dir of CONTENT_DIRS) n += copyTree(path.join(REPO_ROOT, dir), path.join(dest, dir))
      for (const f of CONTENT_FILES) {
        const s = path.join(REPO_ROOT, f)
        if (fs.existsSync(s)) { fs.mkdirSync(dest, { recursive: true }); fs.copyFileSync(s, path.join(dest, f)); n++ }
      }
      // SPA fallback for static hosts (GitHub Pages serves 404.html on unknown routes).
      const index = path.join(outDir, 'index.html')
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(outDir, '404.html'))
      console.log(`[book-content] copied ${n} content files to ${dest}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), bookContent()],
  server: {
    fs: {
      allow: ['..']
    }
  }
})
