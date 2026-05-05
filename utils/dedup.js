// Simple in-memory dedup with 10-minute TTL.
// Sufficient for Square retry windows (Square retries within minutes, not hours).
const seen = new Map();
const TTL_MS = 10 * 60 * 1000;

function isDuplicate(id) {
  const expiresAt = seen.get(id);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    seen.delete(id);
    return false;
  }
  return true;
}

function markProcessed(id) {
  seen.set(id, Date.now() + TTL_MS);
  // Periodically clean expired entries to prevent memory leak
  if (seen.size > 1000) {
    const now = Date.now();
    for (const [key, exp] of seen) {
      if (now > exp) seen.delete(key);
    }
  }
}

module.exports = { isDuplicate, markProcessed };
