// Hospital-scoped smart suggestion bank.
const KEY = "mediflow.suggestions";

type Bank = Record<string, Record<string, Record<string, number>>>;
// hospitalCode -> field -> term -> usageCount

function read(): Bank {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function write(b: Bank) {
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
  const t = term.trim();
  if (!t) return;
  const b = read();
  b[hospital] ??= {};
  b[hospital][field] ??= {};
  b[hospital][field][t] = (b[hospital][field][t] ?? 0) + 1;
  write(b);
}
