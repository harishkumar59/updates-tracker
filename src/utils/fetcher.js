// ─── fetchSiteValue ─────────────────────────────────────────────────────────
// This module contains the core data-fetching & HTML-parsing logic.
//
// CORS Problem:
//   Browsers block direct fetch() requests to third-party domains
//   (cross-origin resource sharing – CORS).  We route every request
//   through a public CORS proxy that returns the raw HTML.
//
// Proxy strategy:
//   We try two proxies in order so that if one is down or rate-limits
//   the request, the other takes over automatically.
//
//   1. corsproxy.io  – returns the raw HTML body directly (fast, no JSON wrap)
//   2. allorigins.win – returns JSON: { "contents": "<html>..." }
//
// Parsing steps (same for both proxies):
//   1. Build the proxied URL and fetch.
//   2. Extract the raw HTML string from the response.
//   3. Feed it into the browser's native DOMParser.
//   4. Run querySelector(cssSelector) on the parsed document.
//   5. Return .textContent (trimmed).

// ─── Proxy Definitions ────────────────────────────────────────────────────────
const PROXIES = [
  {
    // corsproxy.io: responds with the raw page HTML directly (no JSON wrapper).
    buildUrl: (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    extractHtml: async (response) => {
      if (!response.ok) throw new Error(`corsproxy.io returned HTTP ${response.status}`);
      return response.text();
    },
  },
  {
    // allorigins.win: responds with JSON { contents: "<html>..." }.
    buildUrl: (url) =>
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    extractHtml: async (response) => {
      if (!response.ok) throw new Error(`allorigins returned HTTP ${response.status}`);
      const json = await response.json();
      if (!json?.contents) throw new Error('allorigins returned an empty response.');
      return json.contents;
    },
  },
];

/**
 * Fetches the HTML at `targetUrl` via a CORS proxy (with automatic fallback),
 * parses it with DOMParser, and returns the trimmed textContent of the first
 * element matching `cssSelector`.
 *
 * @param {string} targetUrl   – The real URL of the page to scrape.
 * @param {string} cssSelector – A valid CSS selector, e.g. "#exam-date" or ".notification-link".
 * @returns {Promise<string>}  – The extracted text value, or throws an Error.
 */
export async function fetchSiteValue(targetUrl, cssSelector) {
  let lastError = null;

  // Try each proxy in order; move on if one fails.
  for (const proxy of PROXIES) {
    try {
      // Step 1 – Build the proxied URL and fetch.
      const proxiedUrl = proxy.buildUrl(targetUrl);
      const response = await fetch(proxiedUrl, {
        // A short signal keeps the UI responsive; proxies usually respond < 15 s.
        signal: AbortSignal.timeout(15_000),
      });

      // Step 2 – Extract the raw HTML from the response (proxy-specific).
      const rawHtml = await proxy.extractHtml(response);

      // Step 3 – Parse the raw HTML string with the browser's built-in DOMParser.
      //   "text/html" mode creates a full document (with <head> and <body>).
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, 'text/html');

      // Step 4 – Run querySelector with the user-supplied CSS selector.
      const element = doc.querySelector(cssSelector);
      if (!element) {
        throw new Error(`No element found matching "${cssSelector}"`);
      }

      // Step 5 – Extract text.
      //   textContent is always available; we trim whitespace-only strings.
      const value = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
      return value || '(element exists but contains no text)';

    } catch (err) {
      // Record the error and try the next proxy.
      lastError = err;
      console.warn(`[ExamPulse] Proxy attempt failed:`, err.message);
    }
  }

  // All proxies failed – surface the last error to the card UI.
  throw lastError ?? new Error('All proxies failed.');
}
