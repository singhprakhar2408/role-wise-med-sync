// MediFlow Clinical — production auth via Supabase + queue/lab/prescription
// data still in localStorage (frontend-only demo data). Auth, hospital
// verification, and profile/staff management are all Supabase-backed.

import { supabase } from "@/integrations/supabase/client";

export type Role =
  | "super_admin"
  | "hospital_admin"
  | "doctor"
  | "compounder"
  | "lab"
  | "pharmacist"
  | "records_viewer";

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  hospital_admin: "Hospital Admin",
  doctor: "Doctor",
  compounder: "Compounder",
  lab: "Laboratory",
  pharmacist: "Pharmacist",
  records_viewer: "Records Viewer",
};

export const REGISTRABLE_ROLES: Role[] = [
  "doctor",
  "compounder",
  "lab",
  "pharmacist",
  "records_viewer",
];

export const DOCTOR_SPECIALTIES = [
  "General Medicine",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Gynecology",
  "Dermatology",
  "ENT",
  "Ophthalmology",
  "Psychiatry",
  "Pulmonology",
  "Gastroenterology",
  "Nephrology",
  "Oncology",
  "Endocrinology",
  "General Surgery",
] as const;

export interface Hospital {
  id: string;
  code: string;
  name: string;
  status: "active" | "inactive";
}

export interface StaffAccount {
  id: string;
  hospitalId: string | null;
  hospitalCode: string;
  fullName: string;
  email: string;
  mobile: string;
  role: Role;
  department: string;
  specialty?: string;
  licenseNo?: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  active: boolean;
  createdAt: number;
}

const PROFILE_CACHE_KEY = "mediflow.profile";
const HOSPITAL_CACHE_KEY = "mediflow.hospitalCache";

interface ProfileRow {
  id: string;
  hospital_id: string | null;
  full_name: string;
  email: string;
  mobile: string | null;
  role: Role;
  department: string | null;
  specialty: string | null;
  license_no: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
}

function rowToAccount(p: ProfileRow, hospitalCode: string): StaffAccount {
  return {
    id: p.id,
    hospitalId: p.hospital_id,
    hospitalCode,
    fullName: p.full_name,
    email: p.email,
    mobile: p.mobile ?? "",
    role: p.role,
    department: p.department ?? "",
    specialty: p.specialty ?? undefined,
    licenseNo: p.license_no ?? undefined,
    status: p.status,
    active: p.status === "approved",
    createdAt: new Date(p.created_at).getTime(),
  };
}

function cacheProfile(account: StaffAccount) {
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(account));
}
function clearProfileCache() {
  localStorage.removeItem(PROFILE_CACHE_KEY);
}

// --- Hospital lookup (Supabase) ---
export async function verifyHospitalCode(code: string): Promise<Hospital> {
  const normalized = code.trim();
  const { data, error } = await supabase
    .from("hospitals")
    .select("id, code, name, status")
    .eq("code", normalized)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Hospital code not found or inactive.");
  const hospital = data as Hospital;
  if (typeof window !== "undefined") {
    const cache = JSON.parse(localStorage.getItem(HOSPITAL_CACHE_KEY) || "{}");
    cache[hospital.code] = hospital;
    cache[hospital.id] = hospital;
    localStorage.setItem(HOSPITAL_CACHE_KEY, JSON.stringify(cache));
  }
  return hospital;
}

export function cachedHospital(idOrCode: string): Hospital | undefined {
  if (typeof window === "undefined") return undefined;
  const cache = JSON.parse(localStorage.getItem(HOSPITAL_CACHE_KEY) || "{}");
  return cache[idOrCode];
}

export async function listHospitals(): Promise<Hospital[]> {
  const { data, error } = await supabase
    .from("hospitals")
    .select("id, code, name, status")
    .order("code");
  if (error) throw new Error(error.message);
  return (data ?? []) as Hospital[];
}

// --- Login ---
export async function loginStaff(
  hospitalCode: string,
  email: string,
  password: string,
): Promise<StaffAccount> {
  // 1. Verify hospital exists + active
  const hospital = await verifyHospitalCode(hospitalCode);
  // 2. Sign in
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (authErr || !auth.user) throw new Error(authErr?.message || "Invalid credentials.");
  // 3. Fetch profile
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (profErr || !profile) {
    await supabase.auth.signOut();
    throw new Error("Your profile is not set up. Contact administrator.");
  }
  const p = profile as ProfileRow;
  // 4. Status checks
  if (p.status === "pending") {
    await supabase.auth.signOut();
    throw new Error("Your account is awaiting administrator approval.");
  }
  if (p.status === "rejected") {
    await supabase.auth.signOut();
    throw new Error("Your registration request was rejected.");
  }
  if (p.status === "suspended") {
    await supabase.auth.signOut();
    throw new Error("Your account has been suspended. Contact your hospital administrator.");
  }
  // 5. Hospital match (super_admin exempt)
  if (p.role !== "super_admin" && p.hospital_id !== hospital.id) {
    await supabase.auth.signOut();
    throw new Error("This account does not belong to the selected hospital.");
  }
  const account = rowToAccount(p, p.role === "super_admin" ? hospital.code : hospital.code);
  cacheProfile(account);
  return account;
}

// --- Register ---
export interface RegisterStaffInput {
  hospitalCode: string;
  fullName: string;
  email: string;
  mobile: string;
  role: Role;
  department: string;
  specialty?: string;
  licenseNo?: string;
  password: string;
}

export async function registerStaff(input: RegisterStaffInput): Promise<void> {
  if (!REGISTRABLE_ROLES.includes(input.role)) {
    throw new Error("Selected role is not allowed for self-registration.");
  }
  const hospital = await verifyHospitalCode(input.hospitalCode);
  const { data: auth, error: authErr } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/access`,
      data: {
        full_name: input.fullName,
        mobile: input.mobile,
      },
    },
  });
  if (authErr || !auth.user) throw new Error(authErr?.message || "Could not create account.");

  // Insert profile (user is signed-in immediately on signUp when email confirm disabled)
  const { error: insErr } = await supabase.from("profiles").insert({
    id: auth.user.id,
    hospital_id: hospital.id,
    full_name: input.fullName,
    email: input.email.trim(),
    mobile: input.mobile,
    role: input.role,
    department: input.department,
    specialty: input.specialty ?? null,
    license_no: input.licenseNo ?? null,
    // status forced to 'pending' by DB trigger for non-super-admin
  });
  // Sign back out so they wait for approval
  await supabase.auth.signOut();
  if (insErr) throw new Error(insErr.message);
}

// --- Session / current user cache ---
export function currentUser(): StaffAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as StaffAccount) : null;
  } catch {
    return null;
  }
}

export async function refreshCurrentProfile(): Promise<StaffAccount | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) {
    clearProfileCache();
    return null;
  }
  const userId = session.session.user.id;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profile) {
    clearProfileCache();
    return null;
  }
  const p = profile as ProfileRow;
  let hospitalCode = "";
  if (p.hospital_id) {
    const cached = cachedHospital(p.hospital_id);
    if (cached) hospitalCode = cached.code;
    else {
      const { data: h } = await supabase
        .from("hospitals")
        .select("id, code, name, status")
        .eq("id", p.hospital_id)
        .maybeSingle();
      if (h) {
        hospitalCode = (h as Hospital).code;
        const cache = JSON.parse(localStorage.getItem(HOSPITAL_CACHE_KEY) || "{}");
        cache[(h as Hospital).code] = h;
        cache[(h as Hospital).id] = h;
        localStorage.setItem(HOSPITAL_CACHE_KEY, JSON.stringify(cache));
      }
    }
  } else if (p.role === "super_admin") {
    hospitalCode = "GLOBAL";
  }
  const account = rowToAccount(p, hospitalCode);
  cacheProfile(account);
  return account;
}

export async function logout() {
  await supabase.auth.signOut();
  clearProfileCache();
}

// --- Staff management (hospital_admin / super_admin) ---
export async function fetchStaffForHospital(hospitalId: string): Promise<StaffAccount[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const hospital = cachedHospital(hospitalId);
  const code = hospital?.code ?? "";
  return ((data ?? []) as ProfileRow[]).map((p) => rowToAccount(p, code));
}

export async function setUserStatus(
  id: string,
  status: "approved" | "rejected" | "suspended",
): Promise<void> {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

// --- Hospitals admin (super_admin) ---
export async function createHospital(code: string, name: string): Promise<Hospital> {
  const { data, error } = await supabase
    .from("hospitals")
    .insert({ code: code.trim(), name: name.trim(), status: "active" })
    .select("id, code, name, status")
    .single();
  if (error) throw new Error(error.message);
  return data as Hospital;
}

// =====================================================================
// Below: legacy localStorage-backed clinical data (queue / lab / rx).
// Unchanged; this is demo workflow state, not user auth.
// =====================================================================

const KEY_LAB_ORDERS = "mediflow.labOrders";
const KEY_PATIENT_QUEUE = "mediflow.patientQueue";
const KEY_PRESCRIPTIONS = "mediflow.prescriptions";
const LAB_ORDERS_EVENT = "mediflow.labOrders.changed";
const PATIENT_QUEUE_EVENT = "mediflow.patientQueue.changed";
const PRESCRIPTIONS_EVENT = "mediflow.prescriptions.changed";

export type LabOrderStatus = "pending" | "sample_collected" | "processing" | "report_uploaded";
export type PatientQueueStatus =
  | "waiting_for_doctor"
  | "under_review"
  | "lab_pending"
  | "lab_report_received"
  | "pharmacy_pending"
  | "closed";

export interface LabOrder {
  id: string;
  hospitalCode: string;
  patientId: string;
  patient: string;
  test: string;
  priority: "Routine" | "Urgent" | "STAT";
  status: LabOrderStatus;
  summary?: string;
  completedAt?: number;
  orderedAt: number;
  orderedById?: string;
  orderedByName?: string;
  uploadedById?: string;
  uploadedByName?: string;
}

export interface PatientQueueRecord {
  id: string;
  hospitalCode: string;
  name: string;
  age: number;
  gender: string;
  mobile?: string;
  complaint: string;
  symptoms?: string;
  previousDiseases?: string;
  status: PatientQueueStatus;
  bp?: string;
  pulse?: string;
  temp?: string;
  spo2?: string;
  weight?: string;
  rr?: string;
  allergies?: string;
  history?: string;
  assignedTo?: string;
  assignedDoctorId?: string;
  assignedSpecialty?: string;
  createdAt: number;
  createdById?: string;
  createdByName?: string;
}

export interface PrescriptionItem {
  med: string;
  salt: string;
  dose: string;
  freq: string;
  days: string;
  route: string;
  instr?: string;
}

export interface PrescriptionOrder {
  id: string;
  hospitalCode: string;
  patientId: string;
  patient: string;
  items: PrescriptionItem[];
  status: "pending" | "dispensed";
  orderedAt: number;
  orderedById?: string;
  orderedByName?: string;
  dispensedAt?: number;
  dispensedById?: string;
  dispensedByName?: string;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

function savePatientQueue(queue: PatientQueueRecord[]) {
  write(KEY_PATIENT_QUEUE, queue);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PATIENT_QUEUE_EVENT));
}

export function getPatientQueue(hospitalCode: string): PatientQueueRecord[] {
  if (!hospitalCode) return [];
  const all = read<PatientQueueRecord[]>(KEY_PATIENT_QUEUE, []);
  return all.filter((p) => p.hospitalCode === hospitalCode);
}

export function addPatientToQueue(
  input: Omit<PatientQueueRecord, "createdAt" | "status"> & { status?: PatientQueueStatus },
) {
  const all = read<PatientQueueRecord[]>(KEY_PATIENT_QUEUE, []);
  const record: PatientQueueRecord = {
    ...input,
    status: input.status ?? "waiting_for_doctor",
    createdAt: Date.now(),
  };
  savePatientQueue([record, ...all]);
  return record;
}

export function updatePatientQueueRecord(
  hospitalCode: string,
  id: string,
  patch: Partial<PatientQueueRecord>,
) {
  const all = read<PatientQueueRecord[]>(KEY_PATIENT_QUEUE, []);
  savePatientQueue(
    all.map((p) => (p.hospitalCode === hospitalCode && p.id === id ? { ...p, ...patch } : p)),
  );
}

export function subscribePatientQueue(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY_PATIENT_QUEUE) listener();
  };
  window.addEventListener(PATIENT_QUEUE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PATIENT_QUEUE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

function saveLabOrders(orders: LabOrder[]) {
  write(KEY_LAB_ORDERS, orders);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(LAB_ORDERS_EVENT));
}

export function getLabOrders(hospitalCode: string): LabOrder[] {
  if (!hospitalCode) return [];
  const all = read<LabOrder[]>(KEY_LAB_ORDERS, []);
  return all.filter((o) => o.hospitalCode === hospitalCode);
}

export function addLabOrdersForPatient(input: {
  hospitalCode: string;
  patientId: string;
  patient: string;
  tests: string[];
  priority?: LabOrder["priority"];
  orderedById?: string;
  orderedByName?: string;
}) {
  const all = read<LabOrder[]>(KEY_LAB_ORDERS, []);
  const now = Date.now();
  const newOrders = input.tests.map(
    (test, index): LabOrder => ({
      id: `L-${Math.floor(100 + Math.random() * 900)}-${now.toString(36)}-${index + 1}`,
      hospitalCode: input.hospitalCode,
      patientId: input.patientId,
      patient: input.patient,
      test,
      priority: input.priority ?? "Routine",
      status: "pending",
      orderedAt: now,
      orderedById: input.orderedById,
      orderedByName: input.orderedByName,
    }),
  );
  saveLabOrders([...newOrders, ...all]);
  return newOrders;
}

export function updateLabOrder(hospitalCode: string, id: string, patch: Partial<LabOrder>) {
  const all = read<LabOrder[]>(KEY_LAB_ORDERS, []);
  saveLabOrders(
    all.map((o) => (o.hospitalCode === hospitalCode && o.id === id ? { ...o, ...patch } : o)),
  );
}

export function subscribeLabOrders(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY_LAB_ORDERS) listener();
  };
  window.addEventListener(LAB_ORDERS_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LAB_ORDERS_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

function savePrescriptions(orders: PrescriptionOrder[]) {
  write(KEY_PRESCRIPTIONS, orders);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PRESCRIPTIONS_EVENT));
}

export function getPrescriptionOrders(hospitalCode: string): PrescriptionOrder[] {
  if (!hospitalCode) return [];
  const all = read<PrescriptionOrder[]>(KEY_PRESCRIPTIONS, []);
  return all.filter((o) => o.hospitalCode === hospitalCode);
}

export function addPrescriptionForPatient(input: {
  hospitalCode: string;
  patientId: string;
  patient: string;
  items: PrescriptionItem[];
  orderedById?: string;
  orderedByName?: string;
}) {
  const all = read<PrescriptionOrder[]>(KEY_PRESCRIPTIONS, []);
  const now = Date.now();
  const order: PrescriptionOrder = {
    id: `RX-${Math.floor(100 + Math.random() * 900)}-${now.toString(36)}`,
    hospitalCode: input.hospitalCode,
    patientId: input.patientId,
    patient: input.patient,
    items: input.items,
    status: "pending",
    orderedAt: now,
    orderedById: input.orderedById,
    orderedByName: input.orderedByName,
  };
  savePrescriptions([order, ...all]);
  return order;
}

export function updatePrescriptionOrder(
  hospitalCode: string,
  id: string,
  patch: Partial<PrescriptionOrder>,
) {
  const all = read<PrescriptionOrder[]>(KEY_PRESCRIPTIONS, []);
  savePrescriptions(
    all.map((o) => (o.hospitalCode === hospitalCode && o.id === id ? { ...o, ...patch } : o)),
  );
}

export function subscribePrescriptionOrders(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY_PRESCRIPTIONS) listener();
  };
  window.addEventListener(PRESCRIPTIONS_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PRESCRIPTIONS_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
