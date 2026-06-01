// Hospital-scoped smart suggestion bank (frontend mock).
const KEY = "mediflow.suggestions";

type Bank = Record<string, Record<string, Record<string, number>>>;
// hospitalCode -> field -> term -> usageCount

function read(): Bank {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function write(b: Bank) { localStorage.setItem(KEY, JSON.stringify(b)); }

const SEED: Record<string, string[]> = {
  symptom: ["Chest pain", "Chest tightness", "Chest discomfort", "Fever", "Cough", "Headache", "Shortness of breath", "Abdominal pain", "Nausea", "Dizziness"],
  diagnosis: ["Hypertension", "Type 2 Diabetes", "Acute pharyngitis", "Migraine", "URTI", "Gastritis", "Asthma", "Pneumonia"],
  test: ["CBC", "CRP", "Chest X-ray", "ECG", "Troponin I", "Lipid profile", "HbA1c", "Urine routine", "LFT", "KFT"],
  medicine: ["Atorvastatin", "Amlodipine", "Telmisartan", "Metformin", "Paracetamol", "Azithromycin", "Pantoprazole", "Amoxicillin"],
  salt: ["Atorvastatin Calcium", "Amlodipine Besilate", "Telmisartan", "Metformin HCl"],
  organ: ["Heart", "Lungs", "Liver", "Kidney", "Brain", "Stomach"],
  body_system: ["Cardiovascular", "Respiratory", "Gastrointestinal", "Neurological", "Renal", "Endocrine"],
  department: ["Cardiology", "General Medicine", "Pulmonology", "Pediatrics", "Orthopedics", "Neurology"],
  frequency: ["OD", "BD", "TDS", "QID", "HS", "SOS"],
  route: ["PO", "IV", "IM", "SC", "Topical"],
};

export function getSuggestions(hospital: string, field: string, query: string, limit = 8): string[] {
  const b = read();
  const local = b[hospital]?.[field] ?? {};
  const seed = SEED[field] ?? [];
  const merged: Record<string, number> = { ...Object.fromEntries(seed.map(s => [s, 0])), ...local };
  const q = query.trim().toLowerCase();
  return Object.entries(merged)
    .filter(([term]) => !q || term.toLowerCase().includes(q))
    .sort((a, b2) => b2[1] - a[1] || a[0].localeCompare(b2[0]))
    .slice(0, limit)
    .map(([t]) => t);
}

export function learn(hospital: string, field: string, term: string) {
  const t = term.trim(); if (!t) return;
  const b = read();
  b[hospital] ??= {};
  b[hospital][field] ??= {};
  b[hospital][field][t] = (b[hospital][field][t] ?? 0) + 1;
  write(b);
}
