/**
 * System Core Configuration.
 * Single frozen source of truth for tunables; keeping them out of logic files means
 * no magic numbers inside hot paths and trivially testable timing (swap values in tests).
 */
export const CONFIG = Object.freeze({
  SEARCH_DEBOUNCE_MS: 150,          // coalesces keystrokes: 1 filter+render per pause, not per key
  REPLY_MIN_MS: 1500,               // mock server latency window (spec: 1.5s-3s)
  REPLY_MAX_MS: 3000,
  MOBILE_BREAKPOINT_PX: 768,        // mirrors the @media rule in styles.css
  AVATAR_COLORS: Object.freeze(['#e17076', '#7bc862', '#e5ca77', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb', '#faa774']),
});
