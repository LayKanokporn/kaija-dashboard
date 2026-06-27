// api.js — GAS client, no manual cache (React Query handles caching)
const GAS_URL = import.meta.env.VITE_GAS_URL;

function log_(level, fn, msg, ctx) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] [api/${fn}] ${msg}` + (ctx ? ' | ' + JSON.stringify(ctx) : ''));
}

async function fetchGAS(action, params = {}) {
  const t0 = performance.now();
  const url = new URL(GAS_URL);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  log_('INFO', action, 'request', params);
  try {
    const res = await fetch(url.toString());
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "GAS error");
    log_('TRACE', action, `${Math.round(performance.now() - t0)}ms`);
    return json.data;
  } catch (e) {
    log_('ERROR', action, e.message, { params });
    throw e;
  }
}

export const api = {
  // READ
  batch:       (days = 7) => fetchGAS("batch",      { days }),
  dashboard:   (date)     => fetchGAS("dashboard",   date ? { date } : {}),
  expense:     (days = 7) => fetchGAS("expense",     { days }),
  storefront:  (days = 7) => fetchGAS("storefront",  { days }),
  stock:       (days = 7) => fetchGAS("stock",       { days }),
  leaderboard: ()         => fetchGAS("leaderboard"),

  // EXPENSE WRITE
  addExpense:    (p)          => fetchGAS("addExpense",    p),
  updateExpense: (p)          => fetchGAS("updateExpense", p),
  deleteExpense: (rowIndex)   => fetchGAS("deleteExpense", { rowIndex }),

  // STOREFRONT WRITE
  addStorefront:    (p)        => fetchGAS("addStorefront",    p),
  updateStorefront: (p)        => fetchGAS("updateStorefront", p),
  deleteStorefront: (rowIndex) => fetchGAS("deleteStorefront", { rowIndex }),

  // STOCK WRITE
  addStock:    (p)          => fetchGAS("addStock",    p),
  updateStock: (p)          => fetchGAS("updateStock", p),
  deleteStock: (rowIndex)   => fetchGAS("deleteStock", { rowIndex }),
};
