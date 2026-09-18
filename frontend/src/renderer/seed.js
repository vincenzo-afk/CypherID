// Session-bound renderer seed (FNV-1a 32-bit).
// Derived from the server-issued watermark displayId + sessionId so every
// protected session renders a distinct temporal/spatial pattern. Never a
// placeholder constant: an empty input yields 0 and the renderer still runs.
export function sessionSeedFrom(...parts) {
  const s = parts.filter(Boolean).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// Milliseconds remaining until an ISO-8601 expiry; null when unparseable.
export function msUntilExpiry(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Number.isFinite(ms) ? ms : null;
}

export function formatCountdown(ms) {
  if (ms == null) return '';
  if (ms <= 0) return 'expired';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}
