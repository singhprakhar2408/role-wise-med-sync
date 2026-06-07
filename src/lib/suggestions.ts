// Smart suggestions are disabled for the production shell until they are backed
// by hospital-scoped Supabase tables with RLS. Never learn clinical terms into
// browser storage.

export function getSuggestions(
  _hospital: string,
  _field: string,
  _query: string,
  _limit = 8,
): string[] {
  return [];
}

export function learn(_hospital: string, _field: string, _term: string) {
  return;
}
