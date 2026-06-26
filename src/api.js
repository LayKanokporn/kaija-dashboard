const GAS_URL = import.meta.env.VITE_GAS_URL;

// ── Client-side cache (TTL 3 นาที) ──────────────────────
const _cache = new Map();
const TTL_MS = 3 * 60 * 1000;

const WRITE_ACTIONS = new Set([
  "addExpense","updateExpense","deleteExpense",
  "addStorefront","updateStorefront","deleteStorefront",
  "addStock","updateStock","deleteStock",
]);

// invalidate ทุก key ที่เกี่ยวกับ prefix
function invalidate(...prefixes) {
  for (const k of _cache.keys()) {
    if (prefixes.some(p => k.startsWith(p))) _cache.delete(k);
  }
}

async function fetchGAS(action, params = {}) {
  const key = action + "|" + JSON.stringify(params);
  const isWrite = WRITE_ACTIONS.has(action);

  // cache hit
  if (!isWrite) {
    const hit = _cache.get(key);
    if (hit && Date.now() - hit.ts < TTL_MS) return hit.data;
  }

  const url = new URL(GAS_URL);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res  = await fetch(url.toString());
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "GAS error");

  // cache store
  if (!isWrite) _cache.set(key, { ts: Date.now(), data: json.data });

  // invalidate related caches after write
  if (action.includes("Expense"))    invalidate("expense","batch","dashboard");
  if (action.includes("Storefront")) invalidate("storefront","batch","dashboard");
  if (action.includes("Stock"))      invalidate("stock","batch","dashboard");

  return json.data;
}

export const api = {
  // BATCH — 1 request ดึงทุก tab
  batch: (days = 7) => fetchGAS("batch", { days }),

  // READ (fallback แยก tab)
  dashboard:   (date)     => fetchGAS("dashboard",   date ? { date } : {}),
  expense:     (days = 7) => fetchGAS("expense",     { days }),
  storefront:  (days = 7) => fetchGAS("storefront",  { days }),
  stock:       (days = 7) => fetchGAS("stock",       { days }),
  leaderboard: ()         => fetchGAS("leaderboard"),

  // EXPENSE WRITE
  addExpense:    (p) => fetchGAS("addExpense",    p),
  updateExpense: (p) => fetchGAS("updateExpense", p),
  deleteExpense: (rowIndex) => fetchGAS("deleteExpense", { rowIndex }),

  // STOREFRONT WRITE
  addStorefront:    (p) => fetchGAS("addStorefront",    p),
  updateStorefront: (p) => fetchGAS("updateStorefront", p),
  deleteStorefront: (rowIndex) => fetchGAS("deleteStorefront", { rowIndex }),

  // STOCK WRITE
  addStock:    (p) => fetchGAS("addStock",    p),
  updateStock: (p) => fetchGAS("updateStock", p),
  deleteStock: (rowIndex) => fetchGAS("deleteStock", { rowIndex }),

  // invalidate ทั้งหมด (ใช้หลัง write หรือ manual refresh)
  clearCache: () => _cache.clear(),
};
