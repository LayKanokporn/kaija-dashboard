const GAS_URL = import.meta.env.VITE_GAS_URL;

async function fetchGAS(action, params = {}) {
  const url = new URL(GAS_URL);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "GAS error");
  return json.data;
}

export const api = {
  dashboard: (date) => fetchGAS("dashboard", date ? { date } : {}),
  expense:   (days = 7)  => fetchGAS("expense",    { days }),
  storefront:(days = 7)  => fetchGAS("storefront", { days }),
  stock:     (days = 7)  => fetchGAS("stock",      { days }),
  leaderboard: ()        => fetchGAS("leaderboard"),
};
