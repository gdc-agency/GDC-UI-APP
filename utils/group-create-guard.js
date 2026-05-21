/**
 * Client-side guard against duplicate group creation (double-tap / rapid submit).
 */

/** @type {Map<string, Promise<string>>} */
const inFlight = new Map();

/** @type {Map<string, { id: string; at: number }>} */
const recentResults = new Map();

const RESULT_TTL_MS = 120_000;

function prune() {
  const now = Date.now();
  for (const [k, v] of recentResults.entries()) {
    if (now - v.at > RESULT_TTL_MS) recentResults.delete(k);
  }
}

/**
 * @param {{
 *   name: string;
 *   memberIds: string[];
 *   creatorId: string;
 *   idempotencyKey: string;
 * }} params
 */
export function buildGroupCreateKey({ name, memberIds, creatorId, idempotencyKey }) {
  const idem = String(idempotencyKey || '').trim();
  if (idem) return `idem:${idem}`;
  const members = [...memberIds.map(String)].sort().join(',');
  return `grp:${creatorId}:${String(name || '').trim().toLowerCase()}:${members}`;
}

/**
 * @param {string} key
 * @param {() => Promise<string>} fn
 * @returns {Promise<string>}
 */
export async function runGroupCreateOnce(key, fn) {
  prune();
  const cached = recentResults.get(key);
  if (cached?.id) return cached.id;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const id = await fn();
    if (id) recentResults.set(key, { id: String(id), at: Date.now() });
    return id;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  }
}

export function createGroupIdempotencyKey() {
  return `grp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
