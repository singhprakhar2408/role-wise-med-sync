// Hospital-scoped smart suggestion bank.
const KEY = "mediflow.suggestions";
const IS_PRODUCTION = import.meta.env.PROD;

function blockClinicalBrowserStorage(action: string) {
  if (IS_PRODUCTION) {
    throw new Error(
      `Blocked unsafe clinical browser storage in production: ${action}. Move this workflow to Supabase/Postgres with RLS before accepting real patient data.`,
    );
  }
}

type Bank = Record<string, Record<string, Record<string, number>>>;
// hospitalCode -> field -> term -> usageCount

function read(): Bank {
  if (typeof window === "undefined") return {};
  if (IS_PRODUCTION) return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function write(b: Bank) {
  blockClinicalBrowserStorage("write clinical suggestion bank");
  localStorage.setItem(KEY, JSON.stringify(b));
}

export function getSuggestions(
  hospital: string,
  field: string,
  query: string,
  limit = 8,
): string[] {
  const b = read();
  const local = b[hospital]?.[field] ?? {};
  const merged: Record<string, number> = { ...local };
  const q = query.trim().toLowerCase();
  return Object.entries(merged)
    .filter(([term]) => !q || term.toLowerCase().includes(q))
    .sort((a, b2) => b2[1] - a[1] || a[0].localeCompare(b2[0]))
    .slice(0, limit)
    .map(([t]) => t);
}

export function learn(hospital: string, field: string, term: string) {
  blockClinicalBrowserStorage("learn clinical suggestion");
  const t = term.trim();
  if (!t) return;
  const b = read();
  b[hospital] ??= {};
  b[hospital][field] ??= {};
  b[hospital][field][t] = (b[hospital][field][t] ?? 0) + 1;
  write(b);
}
