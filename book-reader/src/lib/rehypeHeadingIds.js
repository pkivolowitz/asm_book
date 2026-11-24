// Gives every heading an id the way GitHub does, so the book's in-page links
// ("#implementing-a-break", "#6-what-instrumenting-a-fuzzing-target-means")
// work in the reader exactly as they do on GitHub.
//
// GitHub's rule (github-slugger): lowercase, drop every character that is not
// a letter, digit, mark, connector, space or hyphen, then turn each space into
// a hyphen. A repeated slug gets "-1", "-2", ... appended.

const DISALLOWED = /[^\p{L}\p{M}\p{N}\p{Pc} -]/gu;

export function githubSlug(text) {
  return String(text).toLowerCase().replace(DISALLOWED, '').replace(/ /g, '-');
}

const textOf = (node) => {
  if (node.type === 'text') return node.value;
  return (node.children || []).map(textOf).join('');
};

export default function rehypeHeadingIds() {
  return (tree) => {
    const used = new Map();
    const walk = (node) => {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        node.properties = node.properties || {};
        if (!node.properties.id) {
          const base = githubSlug(textOf(node));
          const n = used.get(base) || 0;
          used.set(base, n + 1);
          node.properties.id = n ? `${base}-${n}` : base;
        }
        return; // headings do not contain headings
      }
      (node.children || []).forEach(walk);
    };
    walk(tree);
  };
}
