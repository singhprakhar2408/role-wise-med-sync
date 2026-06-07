// MediFlow Clinical — Supabase-backed auth, hospital verification,
// profile/staff management, and clinical workflow persistence.

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
const IS_PRODUCTION = import.meta.env.PROD;

export function blockClinicalBrowserStorage(action: string) {
  if (IS_PRODUCTION) {
    throw new Error(
      `Blocked unsafe clinical browser storage in production: ${action}. Move this workflow to Supabase/Postgres with RLS before accepting real patient data.`,
    );
  }
}

export function normalizeMobile(mobile: string): string {
  const trimmed = mobile.trim();
  const digits = trimmed.replace(/\D/g, "");
  const normalized = trimmed.startsWith("+")
    ? `+${digits}`
    : digits.length === 10
      ? `+91${digits}`
      : `+${digits}`;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("Enter a valid mobile number, for example 9876543210 or +919876543210.");
  }
  return normalized;
}

function assertStrongPassword(password: string) {
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/\W/.test(password)
  ) {
    throw new Error("Password must include uppercase, lowercase, number, and symbol.");
  }
}

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
  const normalized = code.trim().toUpperCase();
  if (normalized === "GLOBAL") {
    return {
      id: "00000000-0000-0000-0000-000000000000",
      code: "GLOBAL",
      name: "MediFlow Platform Administration",
      status: "active",
    };
  }
  const { data, error } = await supabase.rpc("lookup_active_hospital", {
    _code: normalized,
  });
  if (error) throw new Error(error.message);
  const hospital = data?.[0] as Hospital | undefined;
  if (!hospital) throw new Error("Hospital code not found or inactive.");
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

async function fetchCurrentProfileRow(): Promise<ProfileRow> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error("No verified session found.");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) throw new Error("Your profile is not set up. Contact administrator.");
  return profile as ProfileRow;
}

async function accountForVerifiedProfile(hospital: Hospital): Promise<StaffAccount> {
  const p = await fetchCurrentProfileRow();
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
  if (p.role !== "super_admin" && p.hospital_id !== hospital.id) {
    await supabase.auth.signOut();
    throw new Error("This account does not belong to the selected hospital.");
  }
  const account = rowToAccount(p, p.role === "super_admin" ? "GLOBAL" : hospital.code);
  cacheProfile(account);
  return account;
}

// --- Login ---
export async function loginStaff(
  hospitalCode: string,
  email: string,
  password: string,
): Promise<StaffAccount> {
  const hospital = await verifyHospitalCode(hospitalCode);
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (authErr || !auth.user) throw new Error(authErr?.message || "Invalid credentials.");
  return accountForVerifiedProfile(hospital);
}

export async function sendMobileLoginOtp(hospitalCode: string, mobile: string): Promise<string> {
  await verifyHospitalCode(hospitalCode);
  const normalizedPhone = normalizeMobile(mobile);
  console.log("OTP send phone:", normalizedPhone);
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizedPhone,
    options: {
      shouldCreateUser: true,
    },
  });
  if (error) throw new Error(error.message);
  return normalizedPhone;
}

export async function verifyMobileLoginOtp(
  hospitalCode: string,
  mobile: string,
  otp: string,
): Promise<StaffAccount> {
  const hospital = await verifyHospitalCode(hospitalCode);
  const normalizedPhone = normalizeMobile(mobile);
  console.log("OTP verify phone:", normalizedPhone);
  console.log("OTP length:", otp.trim().length);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token: otp.trim(),
    type: "sms",
  });
  if (error || !data.user) throw new Error(error?.message || "Invalid or expired OTP.");
  return accountForVerifiedProfile(hospital);
}

export async function sendPasswordResetMobileOtp(
  hospitalCode: string,
  mobile: string,
): Promise<string> {
  return sendMobileLoginOtp(hospitalCode, mobile);
}

export async function resetPasswordWithMobileOtp(input: {
  hospitalCode: string;
  mobile: string;
  token: string;
  newPassword: string;
}): Promise<StaffAccount> {
  assertStrongPassword(input.newPassword);
  const account = await verifyMobileLoginOtp(input.hospitalCode, input.mobile, input.token);
  const { error } = await supabase.auth.updateUser({ password: input.newPassword });
  if (error) throw new Error(error.message);
  cacheProfile(account);
  return account;
}

export async function sendRegistrationMobileOtp(mobile: string): Promise<string> {
  const normalizedPhone = normalizeMobile(mobile);
  console.log("OTP send phone:", normalizedPhone);
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizedPhone,
    options: {
      shouldCreateUser: true,
    },
  });
  if (error) throw new Error(error.message);
  return normalizedPhone;
}

export async function verifyRegistrationMobileOtp(mobile: string, otp: string): Promise<string> {
  const normalizedPhone = normalizeMobile(mobile);
  console.log("OTP verifying registration phone:", normalizedPhone);
  const { error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token: otp.trim(),
    type: "sms",
  });
  if (error) throw new Error(error.message);
  console.log("OTP verified registration phone:", normalizedPhone);
  return normalizedPhone;
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
  assertStrongPassword(input.password);
  const hospital = await verifyHospitalCode(input.hospitalCode);
  const phone = normalizeMobile(input.mobile);
  const { data: session } = await supabase.auth.getSession();
  const user = session.session?.user;
  if (!user) throw new Error("Verify your registered mobile before submitting.");
  if (user.phone !== phone) {
    throw new Error("Verified mobile does not match the registration mobile.");
  }

  const { data: existing, error: existingErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existingErr) throw new Error(existingErr.message);
  if (existing) throw new Error("This staff account is already registered.");

  const { error: updateErr } = await supabase.auth.updateUser(
    {
      email: input.email.trim(),
      password: input.password,
      data: {
        full_name: input.fullName,
        mobile: phone,
      },
    },
    {
      emailRedirectTo: `${window.location.origin}/access`,
    },
  );
  if (updateErr) throw new Error(updateErr.message);

  const { error: insErr } = await supabase.from("profiles").insert({
    id: user.id,
    hospital_id: hospital.id,
    full_name: input.fullName,
    email: input.email.trim(),
    mobile: phone,
    role: input.role,
    department: input.department,
    specialty: input.specialty ?? null,
    license_no: input.licenseNo ?? null,
  });
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
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

export async function fetchAllStaff(): Promise<StaffAccount[]> {
  const [staffResult, hospitals] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    listHospitals(),
  ]);
  if (staffResult.error) throw new Error(staffResult.error.message);
  const byId = new Map(hospitals.map((hospital) => [hospital.id, hospital]));
  return ((staffResult.data ?? []) as ProfileRow[]).map((p) => {
    const hospital = p.hospital_id ? byId.get(p.hospital_id) : undefined;
    return rowToAccount(p, p.role === "super_admin" ? "GLOBAL" : (hospital?.code ?? ""));
  });
}

export async function setUserStatus(
  id: string,
  status: "approved" | "rejected" | "suspended",
): Promise<void> {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setUserRole(id: string, role: Role): Promise<void> {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
}

// --- Hospitals admin (super_admin) ---
export async function createHospital(code: string, name: string): Promise<Hospital> {
  const { data, error } = await supabase
    .from("hospitals")
    .insert({ code: code.trim().toUpperCase(), name: name.trim(), status: "active" })
    .select("id, code, name, status")
    .single();
  if (error) throw new Error(error.message);
  return data as Hospital;
}

export async function setHospitalStatus(id: string, status: Hospital["status"]): Promise<void> {
  const { error } = await supabase.from("hospitals").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

// =====================================================================
// Clinical workflow persistence. Real patient, queue, lab, prescription,
// pharmacy, and records data lives in Supabase/Postgres tables with RLS.
// Browser storage is intentionally not used for clinical workflows.
// =====================================================================

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

interface ClinicalQuery<T = unknown> extends PromiseLike<{
  data: T;
  error: { message: string } | null;
}> {
  select(columns?: string): ClinicalQuery<T>;
  insert(values: unknown): ClinicalQuery<T>;
  update(values: unknown): ClinicalQuery<T>;
  upsert(values: unknown, options?: unknown): ClinicalQuery<T>;
  eq(column: string, value: unknown): ClinicalQuery<T>;
  order(column: string, options?: unknown): ClinicalQuery<T>;
  maybeSingle(): Promise<{ data: T | null; error: { message: string } | null }>;
  single(): Promise<{ data: T; error: { message: string } | null }>;
}

type DbClient = typeof supabase & {
  from: (table: string) => ClinicalQuery;
  channel: typeof supabase.channel;
};

interface PatientNested {
  display_id?: string;
  full_name?: string;
  age?: number;
  gender?: string;
  mobile?: string | null;
}

interface VitalNested {
  bp?: string | null;
  pulse?: string | null;
  temp?: string | null;
  spo2?: string | null;
  weight?: string | null;
  rr?: string | null;
}

interface EncounterRow {
  id: string;
  display_id: string;
  complaint?: string | null;
  symptoms?: string | null;
  previous_diseases?: string | null;
  status: PatientQueueStatus;
  allergies?: string | null;
  history?: string | null;
  assigned_to?: string | null;
  assigned_doctor_id?: string | null;
  assigned_specialty?: string | null;
  created_at?: string | null;
  created_by_id?: string | null;
  created_by_name?: string | null;
  patients?: PatientNested | PatientNested[] | null;
  vitals?: VitalNested | VitalNested[] | null;
}

interface LabResultNested {
  summary?: string | null;
  completed_at?: string | null;
  uploaded_by_id?: string | null;
  uploaded_by_name?: string | null;
}

interface LabOrderRow {
  id: string;
  display_id: string;
  test: string;
  priority: LabOrder["priority"];
  status: LabOrderStatus;
  ordered_at?: string | null;
  ordered_by_id?: string | null;
  ordered_by_name?: string | null;
  patient_id?: string;
  encounter_id?: string;
  patients?: PatientNested | PatientNested[] | null;
  lab_results?: LabResultNested | LabResultNested[] | null;
}

interface PrescriptionRow {
  id: string;
  display_id: string;
  items: unknown;
  status: PrescriptionOrder["status"];
  ordered_at?: string | null;
  ordered_by_id?: string | null;
  ordered_by_name?: string | null;
  dispensed_at?: string | null;
  dispensed_by_id?: string | null;
  dispensed_by_name?: string | null;
  patients?: PatientNested | PatientNested[] | null;
}

const clinicalDb = supabase as DbClient;

function ms(value: string | null | undefined): number {
  return value ? new Date(value).getTime() : Date.now();
}

function iso(value: number | undefined): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function nestedOne<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

async function auditClinicalEvent(input: {
  hospitalId: string;
  eventType: string;
  entityTable: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  const user = currentUser();
  const { error } = await clinicalDb.from("audit_events").insert({
    hospital_id: input.hospitalId,
    actor_id: user?.id ?? null,
    actor_role: user?.role ?? null,
    event_type: input.eventType,
    entity_table: input.entityTable,
    entity_id: input.entityId ?? null,
    details: input.details ?? {},
  });
  if (error) {
    console.warn("Audit event was not recorded", error.message);
  }
}

async function resolveEncounter(hospitalId: string, displayId: string) {
  const { data, error } = await clinicalDb
    .from("encounters")
    .select("id, patient_id, patients(display_id, full_name)")
    .eq("hospital_id", hospitalId)
    .eq("display_id", displayId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Patient encounter was not found.");
  return data as {
    id: string;
    patient_id: string;
    patients?:
      | { display_id?: string; full_name?: string }
      | { display_id?: string; full_name?: string }[];
  };
}

function encounterRowToQueueRecord(row: EncounterRow, hospitalCode: string): PatientQueueRecord {
  const patient = nestedOne(row.patients);
  const vital = nestedOne(row.vitals);

  return {
    id: row.display_id,
    hospitalCode,
    name: patient?.full_name ?? "",
    age: patient?.age ?? 0,
    gender: patient?.gender ?? "",
    mobile: patient?.mobile ?? undefined,
    complaint: row.complaint ?? "",
    symptoms: row.symptoms ?? undefined,
    previousDiseases: row.previous_diseases ?? undefined,
    status: row.status,
    bp: vital?.bp ?? undefined,
    pulse: vital?.pulse ?? undefined,
    temp: vital?.temp ?? undefined,
    spo2: vital?.spo2 ?? undefined,
    weight: vital?.weight ?? undefined,
    rr: vital?.rr ?? undefined,
    allergies: row.allergies ?? undefined,
    history: row.history ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    assignedDoctorId: row.assigned_doctor_id ?? undefined,
    assignedSpecialty: row.assigned_specialty ?? undefined,
    createdAt: ms(row.created_at),
    createdById: row.created_by_id ?? undefined,
    createdByName: row.created_by_name ?? undefined,
  };
}

export async function getPatientQueue(hospitalCode: string): Promise<PatientQueueRecord[]> {
  if (!hospitalCode) return [];
  const hospital = await verifyHospitalCode(hospitalCode);
  const { data, error } = await clinicalDb
    .from("encounters")
    .select("*, patients(*), vitals(*)")
    .eq("hospital_id", hospital.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as EncounterRow[]).map((row) =>
    encounterRowToQueueRecord(row, hospital.code),
  );
}

export async function addPatientToQueue(
  input: Omit<PatientQueueRecord, "createdAt" | "status"> & { status?: PatientQueueStatus },
): Promise<PatientQueueRecord> {
  const record: PatientQueueRecord = {
    ...input,
    status: input.status ?? "waiting_for_doctor",
    createdAt: Date.now(),
  };
  const hospital = await verifyHospitalCode(input.hospitalCode);
  const { data: patient, error: patientError } = await clinicalDb
    .from("patients")
    .insert({
      hospital_id: hospital.id,
      display_id: input.id,
      full_name: input.name.trim(),
      age: input.age,
      gender: input.gender,
      mobile: input.mobile ?? null,
      created_by_id: input.createdById ?? null,
      created_by_name: input.createdByName ?? null,
    })
    .select("id")
    .single();
  if (patientError) throw new Error(patientError.message);

  const { data: encounter, error: encounterError } = await clinicalDb
    .from("encounters")
    .insert({
      hospital_id: hospital.id,
      patient_id: patient.id,
      display_id: input.id,
      complaint: input.complaint,
      symptoms: input.symptoms ?? null,
      previous_diseases: input.previousDiseases ?? null,
      status: record.status,
      allergies: input.allergies ?? null,
      history: input.history ?? input.previousDiseases ?? null,
      assigned_to: input.assignedTo ?? null,
      assigned_doctor_id: input.assignedDoctorId ?? null,
      assigned_specialty: input.assignedSpecialty ?? null,
      created_by_id: input.createdById ?? null,
      created_by_name: input.createdByName ?? null,
    })
    .select("id")
    .single();
  if (encounterError) throw new Error(encounterError.message);

  if (input.bp || input.pulse || input.temp || input.spo2 || input.weight || input.rr) {
    const { error: vitalsError } = await clinicalDb.from("vitals").insert({
      hospital_id: hospital.id,
      patient_id: patient.id,
      encounter_id: encounter.id,
      bp: input.bp ?? null,
      pulse: input.pulse ?? null,
      temp: input.temp ?? null,
      spo2: input.spo2 ?? null,
      weight: input.weight ?? null,
      rr: input.rr ?? null,
      recorded_by_id: input.createdById ?? null,
      recorded_by_name: input.createdByName ?? null,
    });
    if (vitalsError) throw new Error(vitalsError.message);
  }

  await auditClinicalEvent({
    hospitalId: hospital.id,
    eventType: "patient_intake_created",
    entityTable: "encounters",
    entityId: encounter.id,
    details: { display_id: input.id },
  });
  return record;
}

export async function updatePatientQueueRecord(
  hospitalCode: string,
  id: string,
  patch: Partial<PatientQueueRecord>,
): Promise<void> {
  const hospital = await verifyHospitalCode(hospitalCode);
  const encounter = await resolveEncounter(hospital.id, id);
  const encounterPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.complaint !== undefined) encounterPatch.complaint = patch.complaint;
  if (patch.symptoms !== undefined) encounterPatch.symptoms = patch.symptoms;
  if (patch.previousDiseases !== undefined)
    encounterPatch.previous_diseases = patch.previousDiseases;
  if (patch.status !== undefined) encounterPatch.status = patch.status;
  if (patch.allergies !== undefined) encounterPatch.allergies = patch.allergies;
  if (patch.history !== undefined) encounterPatch.history = patch.history;
  if (patch.assignedTo !== undefined) encounterPatch.assigned_to = patch.assignedTo;
  if (patch.assignedDoctorId !== undefined)
    encounterPatch.assigned_doctor_id = patch.assignedDoctorId;
  if (patch.assignedSpecialty !== undefined)
    encounterPatch.assigned_specialty = patch.assignedSpecialty;

  const { error } = await clinicalDb
    .from("encounters")
    .update(encounterPatch)
    .eq("hospital_id", hospital.id)
    .eq("display_id", id);
  if (error) throw new Error(error.message);

  if (
    patch.name !== undefined ||
    patch.age !== undefined ||
    patch.gender !== undefined ||
    patch.mobile !== undefined
  ) {
    const patientPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) patientPatch.full_name = patch.name;
    if (patch.age !== undefined) patientPatch.age = patch.age;
    if (patch.gender !== undefined) patientPatch.gender = patch.gender;
    if (patch.mobile !== undefined) patientPatch.mobile = patch.mobile;
    const { error: patientError } = await clinicalDb
      .from("patients")
      .update(patientPatch)
      .eq("hospital_id", hospital.id)
      .eq("id", encounter.patient_id);
    if (patientError) throw new Error(patientError.message);
  }

  if (
    patch.bp !== undefined ||
    patch.pulse !== undefined ||
    patch.temp !== undefined ||
    patch.spo2 !== undefined ||
    patch.weight !== undefined ||
    patch.rr !== undefined
  ) {
    const user = currentUser();
    const { error: vitalsError } = await clinicalDb.from("vitals").insert({
      hospital_id: hospital.id,
      patient_id: encounter.patient_id,
      encounter_id: encounter.id,
      bp: patch.bp ?? null,
      pulse: patch.pulse ?? null,
      temp: patch.temp ?? null,
      spo2: patch.spo2 ?? null,
      weight: patch.weight ?? null,
      rr: patch.rr ?? null,
      recorded_by_id: user?.id ?? null,
      recorded_by_name: user?.fullName ?? null,
    });
    if (vitalsError) throw new Error(vitalsError.message);
  }

  await auditClinicalEvent({
    hospitalId: hospital.id,
    eventType: "encounter_updated",
    entityTable: "encounters",
    entityId: encounter.id,
    details: { display_id: id, fields: Object.keys(patch) },
  });
}

export function subscribePatientQueue(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const channel = supabase
    .channel("clinical-patient-queue")
    .on("postgres_changes", { event: "*", schema: "public", table: "encounters" }, listener)
    .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, listener)
    .on("postgres_changes", { event: "*", schema: "public", table: "vitals" }, listener)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

function labOrderRowToRecord(row: LabOrderRow, hospitalCode: string): LabOrder {
  const patient = nestedOne(row.patients);
  const result = nestedOne(row.lab_results);
  return {
    id: row.display_id,
    hospitalCode,
    patientId: patient?.display_id ?? "",
    patient: patient?.full_name ?? "",
    test: row.test,
    priority: row.priority,
    status: row.status,
    summary: result?.summary ?? undefined,
    completedAt: result?.completed_at ? ms(result.completed_at) : undefined,
    orderedAt: ms(row.ordered_at),
    orderedById: row.ordered_by_id ?? undefined,
    orderedByName: row.ordered_by_name ?? undefined,
    uploadedById: result?.uploaded_by_id ?? undefined,
    uploadedByName: result?.uploaded_by_name ?? undefined,
  };
}

export async function getLabOrders(hospitalCode: string): Promise<LabOrder[]> {
  if (!hospitalCode) return [];
  const hospital = await verifyHospitalCode(hospitalCode);
  const { data, error } = await clinicalDb
    .from("lab_orders")
    .select("*, patients(display_id, full_name), lab_results(*)")
    .eq("hospital_id", hospital.id)
    .order("ordered_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as LabOrderRow[]).map((row) => labOrderRowToRecord(row, hospital.code));
}

export async function addLabOrdersForPatient(input: {
  hospitalCode: string;
  patientId: string;
  patient: string;
  tests: string[];
  priority?: LabOrder["priority"];
  orderedById?: string;
  orderedByName?: string;
}): Promise<LabOrder[]> {
  const hospital = await verifyHospitalCode(input.hospitalCode);
  const encounter = await resolveEncounter(hospital.id, input.patientId);
  const now = Date.now();
  const rows = input.tests.map((test, index) => ({
    hospital_id: hospital.id,
    patient_id: encounter.patient_id,
    encounter_id: encounter.id,
    display_id: `L-${Math.floor(100 + Math.random() * 900)}-${now.toString(36)}-${index + 1}`,
    test,
    priority: input.priority ?? "Routine",
    status: "pending",
    ordered_by_id: input.orderedById ?? null,
    ordered_by_name: input.orderedByName ?? null,
    ordered_at: new Date(now).toISOString(),
  }));
  const { data, error } = await clinicalDb
    .from("lab_orders")
    .insert(rows)
    .select("*, patients(display_id, full_name), lab_results(*)");
  if (error) throw new Error(error.message);
  await auditClinicalEvent({
    hospitalId: hospital.id,
    eventType: "lab_orders_created",
    entityTable: "lab_orders",
    details: { patient_display_id: input.patientId, count: rows.length },
  });
  return ((data ?? []) as LabOrderRow[]).map((row) => labOrderRowToRecord(row, hospital.code));
}

export async function updateLabOrder(
  hospitalCode: string,
  id: string,
  patch: Partial<LabOrder>,
): Promise<void> {
  const hospital = await verifyHospitalCode(hospitalCode);
  const { data: order, error: orderLookupError } = await clinicalDb
    .from("lab_orders")
    .select("id, patient_id, encounter_id")
    .eq("hospital_id", hospital.id)
    .eq("display_id", id)
    .maybeSingle();
  if (orderLookupError) throw new Error(orderLookupError.message);
  if (!order) throw new Error("Lab order was not found.");

  const orderPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) orderPatch.status = patch.status;
  if (patch.priority !== undefined) orderPatch.priority = patch.priority;
  if (patch.test !== undefined) orderPatch.test = patch.test;
  const { error } = await clinicalDb
    .from("lab_orders")
    .update(orderPatch)
    .eq("hospital_id", hospital.id)
    .eq("display_id", id);
  if (error) throw new Error(error.message);

  if (
    patch.summary !== undefined ||
    patch.completedAt !== undefined ||
    patch.uploadedById !== undefined
  ) {
    const { error: resultError } = await clinicalDb.from("lab_results").upsert(
      {
        hospital_id: hospital.id,
        lab_order_id: order.id,
        patient_id: order.patient_id,
        encounter_id: order.encounter_id,
        summary: patch.summary ?? "",
        uploaded_by_id: patch.uploadedById ?? null,
        uploaded_by_name: patch.uploadedByName ?? null,
        completed_at: iso(patch.completedAt) ?? new Date().toISOString(),
      },
      { onConflict: "lab_order_id" },
    );
    if (resultError) throw new Error(resultError.message);
  }

  await auditClinicalEvent({
    hospitalId: hospital.id,
    eventType: "lab_order_updated",
    entityTable: "lab_orders",
    entityId: order.id,
    details: { display_id: id, fields: Object.keys(patch) },
  });
}

export function subscribeLabOrders(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const channel = supabase
    .channel("clinical-lab-orders")
    .on("postgres_changes", { event: "*", schema: "public", table: "lab_orders" }, listener)
    .on("postgres_changes", { event: "*", schema: "public", table: "lab_results" }, listener)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

function prescriptionRowToRecord(row: PrescriptionRow, hospitalCode: string): PrescriptionOrder {
  const patient = nestedOne(row.patients);
  return {
    id: row.display_id,
    hospitalCode,
    patientId: patient?.display_id ?? "",
    patient: patient?.full_name ?? "",
    items: Array.isArray(row.items) ? row.items : [],
    status: row.status,
    orderedAt: ms(row.ordered_at),
    orderedById: row.ordered_by_id ?? undefined,
    orderedByName: row.ordered_by_name ?? undefined,
    dispensedAt: row.dispensed_at ? ms(row.dispensed_at) : undefined,
    dispensedById: row.dispensed_by_id ?? undefined,
    dispensedByName: row.dispensed_by_name ?? undefined,
  };
}

export async function getPrescriptionOrders(hospitalCode: string): Promise<PrescriptionOrder[]> {
  if (!hospitalCode) return [];
  const hospital = await verifyHospitalCode(hospitalCode);
  const { data, error } = await clinicalDb
    .from("prescriptions")
    .select("*, patients(display_id, full_name)")
    .eq("hospital_id", hospital.id)
    .order("ordered_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as PrescriptionRow[]).map((row) =>
    prescriptionRowToRecord(row, hospital.code),
  );
}

export async function addPrescriptionForPatient(input: {
  hospitalCode: string;
  patientId: string;
  patient: string;
  items: PrescriptionItem[];
  orderedById?: string;
  orderedByName?: string;
}): Promise<PrescriptionOrder> {
  const hospital = await verifyHospitalCode(input.hospitalCode);
  const encounter = await resolveEncounter(hospital.id, input.patientId);
  const now = Date.now();
  const { data, error } = await clinicalDb
    .from("prescriptions")
    .insert({
      hospital_id: hospital.id,
      patient_id: encounter.patient_id,
      encounter_id: encounter.id,
      display_id: `RX-${Math.floor(100 + Math.random() * 900)}-${now.toString(36)}`,
      items: input.items,
      status: "pending",
      ordered_by_id: input.orderedById ?? null,
      ordered_by_name: input.orderedByName ?? null,
      ordered_at: new Date(now).toISOString(),
    })
    .select("*, patients(display_id, full_name)")
    .single();
  if (error) throw new Error(error.message);
  await auditClinicalEvent({
    hospitalId: hospital.id,
    eventType: "prescription_created",
    entityTable: "prescriptions",
    entityId: data.id,
    details: { patient_display_id: input.patientId, item_count: input.items.length },
  });
  return prescriptionRowToRecord(data, hospital.code);
}

export async function updatePrescriptionOrder(
  hospitalCode: string,
  id: string,
  patch: Partial<PrescriptionOrder>,
): Promise<void> {
  const hospital = await verifyHospitalCode(hospitalCode);
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.items !== undefined) update.items = patch.items;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.dispensedAt !== undefined) update.dispensed_at = iso(patch.dispensedAt);
  if (patch.dispensedById !== undefined) update.dispensed_by_id = patch.dispensedById;
  if (patch.dispensedByName !== undefined) update.dispensed_by_name = patch.dispensedByName;
  const { data, error } = await clinicalDb
    .from("prescriptions")
    .update(update)
    .eq("hospital_id", hospital.id)
    .eq("display_id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  await auditClinicalEvent({
    hospitalId: hospital.id,
    eventType: "prescription_updated",
    entityTable: "prescriptions",
    entityId: data?.id,
    details: { display_id: id, fields: Object.keys(patch) },
  });
}

export function subscribePrescriptionOrders(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const channel = supabase
    .channel("clinical-prescriptions")
    .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions" }, listener)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
