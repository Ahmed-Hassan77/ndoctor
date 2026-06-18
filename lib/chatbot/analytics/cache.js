const CACHE = new Map();
const TTL_MS = 60_000;

/**
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fn
 */
export async function withAnalyticsCache(key, fn) {
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.value;
  }
  const value = await fn();
  CACHE.set(key, { at: Date.now(), value });
  return value;
}

export function clearAnalyticsCache() {
  CACHE.clear();
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function resolveRangeWindow(range = "month") {
  const now = new Date();
  switch (range) {
    case "week":
      return { from: daysAgo(7), to: now, label: "last_7_days" };
    case "today":
      return { from: startOfDay(now), to: now, label: "today" };
    case "month":
    default:
      return { from: startOfMonth(now), to: now, label: "this_month" };
  }
}
