// Practice progress kept in the browser (per device). Storage can be missing
// or throw (private windows, blocked site data), so every access is guarded
// and the app works without it - progress just will not persist.

const KEY = 'lowlevel-lab-progress-v1';
const EVENT = 'lowlevel-lab-progress';

const empty = () => ({ solved: {}, days: {}, drafts: {} });

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw);
    return { ...empty(), ...data };
  } catch {
    return empty();
  }
}

function save(data) {
  try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable or full */ }
  try { window.dispatchEvent(new CustomEvent(EVENT)); } catch { /* non-browser */ }
}

// Local calendar date (not UTC) so a streak follows the learner's own day.
export function localDay(d = new Date()) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getProgress() { return load(); }

export function isSolved(id) { return !!load().solved[id]; }

export function markSolved(id) {
  const data = load();
  const today = localDay();
  if (!data.solved[id]) data.solved[id] = { first: today, count: 0 };
  data.solved[id].count += 1;
  data.solved[id].last = today;
  data.days[today] = (data.days[today] || 0) + 1;
  save(data);
}

export function saveDraft(id, code) {
  if (!id) return;
  const data = load();
  data.drafts[id] = code;
  save(data);
}

export function getDraft(id) { return id ? load().drafts[id] : undefined; }

export function clearDraft(id) {
  const data = load();
  delete data.drafts[id];
  save(data);
}

// Consecutive days (ending today, or yesterday if nothing yet today) with at
// least one solved challenge.
export function streak(data = load()) {
  const d = new Date();
  if (!data.days[localDay(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (data.days[localDay(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function onProgressChange(fn) {
  const h = () => fn(load());
  window.addEventListener(EVENT, h);
  window.addEventListener('storage', h); // other tabs
  return () => { window.removeEventListener(EVENT, h); window.removeEventListener('storage', h); };
}

export function exportProgress() { return JSON.stringify(load(), null, 2); }

export function importProgress(json) {
  const data = JSON.parse(json);
  if (typeof data !== 'object' || !data || typeof data.solved !== 'object') throw new Error('Not a progress file');
  save({ ...empty(), ...data });
}
