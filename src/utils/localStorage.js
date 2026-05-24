// ─── localStorage Utilities ───────────────────────────────────────────────────
// Simple read/write helpers so components don't deal with JSON parsing directly.

const STORAGE_KEY = 'sitepulse_tracked_sites';

/**
 * Load the tracked-sites array from localStorage.
 * Returns an empty array if nothing is stored yet.
 */
export function loadSites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persist the full tracked-sites array to localStorage.
 * @param {Array} sites - The current sites array.
 */
export function saveSites(sites) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
  } catch (err) {
    console.error('Failed to save sites to localStorage:', err);
  }
}
