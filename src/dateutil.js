// dateutil.js — single source of truth for date formats between web ↔ GAS.
// GAS stores/returns Tx Date as dd/mm/yyyy (Gregorian). <input type="date"> needs yyyy-mm-dd.
// Convert ONLY at the boundary: ISO for the input widget, TH for anything sent to GAS.

// yyyy-mm-dd  ->  dd/mm/yyyy
export function isoToTH(iso) {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// dd/mm/yyyy (or dd.mm.yyyy / dd-mm-yyyy, BE or CE)  ->  yyyy-mm-dd
export function thToISO(th) {
  if (!th) return "";
  const m = String(th).match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (!m) return "";
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2500;
  if (y > 2500) y -= 543;            // BE -> CE
  const d = m[1].padStart(2, "0");
  const mo = m[2].padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

// today as dd/mm/yyyy (Gregorian) — matches what GAS returns, zero-padded
export function todayTH() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// today as yyyy-mm-dd for <input type="date"> defaults
export function todayISO() {
  return new Date().toLocaleDateString("en-CA");
}
