// ─── localStorage Utilities ───────────────────────────────────────────────────
// Read/write helpers for trackers and notification settings.

const STORAGE_KEY = 'exampulse_trackers';
const OLD_STORAGE_KEY = 'sitepulse_tracked_sites';
const SETTINGS_KEY = 'exampulse_settings';

/**
 * Migrate data from the old SitePulse key to the new ExamPulse key.
 * Adds default values for new fields that didn't exist before.
 */
function migrateOldData() {
  try {
    const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldRaw) return null;

    const oldSites = JSON.parse(oldRaw);
    if (!Array.isArray(oldSites) || oldSites.length === 0) return null;

    // Add default values for new fields
    const migrated = oldSites.map((site) => ({
      ...site,
      monitorType: site.monitorType || 'other',
      category: site.category || 'other',
      previousValue: site.previousValue || null,
      lastChangedTimestamp: site.lastChangedTimestamp || null,
      status: site.status || (site.autoRefreshInterval > 0 ? 'monitoring' : 'paused'),
      errorMessage: site.errorMessage || null,
      history: site.history || [],
    }));

    // Save under new key and remove old key
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    localStorage.removeItem(OLD_STORAGE_KEY);

    return migrated;
  } catch {
    return null;
  }
}

/**
 * Load the tracked-exams array from localStorage.
 * Returns an empty array if nothing is stored yet.
 * Automatically migrates old SitePulse data on first load.
 */
export function loadSites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // Try migrating old data
    const migrated = migrateOldData();
    if (migrated) return migrated;

    return [];
  } catch {
    return [];
  }
}

/**
 * Persist the full tracked-exams array to localStorage.
 * @param {Array} sites - The current trackers array.
 */
export function saveSites(sites) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
  } catch (err) {
    console.error('Failed to save trackers to localStorage:', err);
  }
}

/**
 * Load notification settings from localStorage.
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : getDefaultSettings();
  } catch {
    return getDefaultSettings();
  }
}

/**
 * Save notification settings to localStorage.
 * @param {Object} settings
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
  }
}

function getDefaultSettings() {
  return {
    browserNotification: true,
    email: { enabled: false, address: '' },
    telegram: { enabled: false, chatId: '' },
    whatsapp: { enabled: false, number: '' },
  };
}
