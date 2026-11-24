// A lesson code block can hold a whole multi-file C project. Each file starts
// with a marker line of its own:
//
//   // file: parser.h
//   ...
//   // file: parser.c
//   ...
//
// The block must start with a marker. It still reads naturally on GitHub,
// and "Run in C Sandbox" opens one tab per file.

const MARKER = /^\s*\/\/\s*file:\s*([A-Za-z0-9_.\-/]+)\s*$/;

// Returns [{ name, content }] for a multi-file block, or null for a plain one.
export function splitCodeFiles(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  if (!MARKER.test(lines[0] || '')) return null;
  const files = [];
  for (const line of lines) {
    const m = MARKER.exec(line);
    if (m) {
      const existing = files.find(f => f.name === m[1]);
      if (existing) return null; // the same name twice: treat it as plain code
      files.push({ name: m[1], lines: [] });
    } else {
      files[files.length - 1].lines.push(line);
    }
  }
  return files.map(f => {
    while (f.lines.length && f.lines[f.lines.length - 1].trim() === '') f.lines.pop();
    while (f.lines.length && f.lines[0].trim() === '') f.lines.shift();
    return { name: f.name, content: `${f.lines.join('\n')}\n` };
  });
}

// The tab to show first: main.c if there is one, else the first .c file.
export function primaryFile(files) {
  return (files.find(f => f.name === 'main.c') || files.find(f => /\.c$/.test(f.name)) || files[0]).name;
}
