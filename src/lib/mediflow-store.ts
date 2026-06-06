// MediFlow Clinical — browser persistence used by the current frontend shell.
// For a real hospital deployment, replace these functions with server-backed APIs.

export type Role =
  | "host_admin"
  | "doctor"
  | "compounder"
  | "lab_technician"
  | "pharmacist"
  | "records_viewer";

export const ROLE_LABEL: Record<Role, string> = {
  host_admin: "Host / Admin",
  doctor: "Doctor",
  compounder: "Compounder",
  lab_technician: "Lab Technician",
  pharmacist: "Pharmacist",
  records_viewer: "Records Viewer",
};

export interface StaffAccount {
  id: string;
  hospitalCode: string;
  fullName: string;
  email: string;
  mobile: string;
  role: Role;
  department: string;
  specialty?: string;
  licenseNo?: string;
  photo?: string;
  passwordHash?: string;
  passwordSalt?: string;
  status: "pending" | "approved" | "rejected";
  active: boolean;
  createdAt: number;
}

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

export interface Session {
  userId: string;
  hospitalCode: string;
}

const KEY_USERS = "mediflow.users";
const KEY_SESSION = "mediflow.session";
const KEY_HOSPITALS = "mediflow.hospitals";
const KEY_LAB_ORDERS = "mediflow.labOrders";
const KEY_PATIENT_QUEUE = "mediflow.patientQueue";
const KEY_PRESCRIPTIONS = "mediflow.prescriptions";
const KEY_STORAGE_VERSION = "mediflow.storageVersion";
const KEY_SUGGESTIONS = "mediflow.suggestions";
const CURRENT_STORAGE_VERSION = "production-v1";
const LAB_ORDERS_EVENT = "mediflow.labOrders.changed";
const PATIENT_QUEUE_EVENT = "mediflow.patientQueue.changed";
const PRESCRIPTIONS_EVENT = "mediflow.prescriptions.changed";

export interface Hospital {
  code: string;
  name: string;
}

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

function ensureProductionStorage() {
  if (typeof window === "undefined") return;
  const version = localStorage.getItem(KEY_STORAGE_VERSION);
  if (version === CURRENT_STORAGE_VERSION) return;

  [
    KEY_USERS,
    KEY_SESSION,
    KEY_HOSPITALS,
    KEY_LAB_ORDERS,
    KEY_PATIENT_QUEUE,
    KEY_PRESCRIPTIONS,
    KEY_SUGGESTIONS,
  ].forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem(KEY_SESSION);
  localStorage.setItem(KEY_STORAGE_VERSION, CURRENT_STORAGE_VERSION);
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  ensureProductionStorage();
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  ensureProductionStorage();
  localStorage.setItem(key, JSON.stringify(val));
}

function configuredHospitals(): Hospital[] {
  const raw = import.meta.env.VITE_MEDIFLOW_HOSPITALS as string | undefined;
  if (!raw?.trim()) return [];

  return raw
    .split(",")
    .map((part) => {
      const [codePart, ...nameParts] = part.split(":");
      const code = codePart?.trim().toUpperCase();
      const name = nameParts.join(":").trim();
      if (!code || !name) return null;
      return { code, name };
    })
    .filter((hospital): hospital is Hospital => Boolean(hospital));
}

export function getHospitals(): Hospital[] {
  const configured = configuredHospitals();
  const local = read<Hospital[]>(KEY_HOSPITALS, []);
  const merged = new Map<string, Hospital>();
  [...configured, ...local].forEach((hospital) =>
    merged.set(hospital.code.toUpperCase(), hospital),
  );
  return [...merged.values()];
}

export function validHospitalCode(code: string): Hospital | undefined {
  return getHospitals().find((h) => h.code.toLowerCase() === code.trim().toLowerCase());
}

export function getUsers(): StaffAccount[] {
  return read(KEY_USERS, [] as StaffAccount[]);
}
function saveUsers(u: StaffAccount[]) {
  write(KEY_USERS, u);
}

function bytesToBase64(bytes: ArrayBuffer | Uint8Array) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...array));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function passwordError(password: string) {
  if (password.length < 12) return "Use at least 12 characters.";
  if (!/[A-Z]/.test(password)) return "Add at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Add at least one lowercase letter.";
  if (!/\d/.test(password)) return "Add at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Add at least one symbol.";
  return "";
}

async function hashPassword(password: string, salt?: string) {
  const resolvedSalt = salt ?? bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBytes(resolvedSalt),
      iterations: 210_000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return { salt: resolvedSalt, hash: bytesToBase64(bits) };
}

function secureCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export type RegisterStaffInput = Omit<
  StaffAccount,
  "id" | "status" | "active" | "createdAt" | "passwordHash" | "passwordSalt"
> & { password: string };

export async function registerStaff(input: RegisterStaffInput): Promise<StaffAccount> {
  if (!validHospitalCode(input.hospitalCode)) {
    throw new Error("Hospital code is not configured for this deployment.");
  }
  const policyError = passwordError(input.password);
  if (policyError) throw new Error(policyError);

  const users = getUsers();
  if (
    users.some(
      (u) =>
        u.email.toLowerCase() === input.email.toLowerCase() &&
        u.hospitalCode === input.hospitalCode,
    )
  ) {
    throw new Error("An account with this email already exists for this hospital.");
  }
  const { password, ...safeInput } = input;
  const passwordRecord = await hashPassword(password);
  const acct: StaffAccount = {
    ...safeInput,
    id: crypto.randomUUID(),
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
    status: "pending",
    active: false,
    createdAt: Date.now(),
  };
  users.push(acct);
  saveUsers(users);
  return acct;
}

export async function loginStaff(
  hospitalCode: string,
  email: string,
  password: string,
  remember: boolean,
): Promise<StaffAccount> {
  const users = getUsers();
  const u = users.find(
    (x) => x.hospitalCode === hospitalCode && x.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!u) throw new Error("Invalid credentials.");
  if (!u.passwordHash || !u.passwordSalt)
    throw new Error("This account must be migrated by an administrator.");
  const attempt = await hashPassword(password, u.passwordSalt);
  if (!secureCompare(attempt.hash, u.passwordHash)) throw new Error("Invalid credentials.");
  if (u.status !== "approved" || !u.active)
    throw new Error("Your account is awaiting Host/Admin approval.");
  const session: Session = { userId: u.id, hospitalCode };
  if (remember) localStorage.setItem(KEY_SESSION, JSON.stringify(session));
  else sessionStorage.setItem(KEY_SESSION, JSON.stringify(session));
  return u;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY_SESSION) || sessionStorage.getItem(KEY_SESSION);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function logout() {
  localStorage.removeItem(KEY_SESSION);
  sessionStorage.removeItem(KEY_SESSION);
}

export function currentUser(): StaffAccount | null {
  const s = getSession();
  if (!s) return null;
  return getUsers().find((u) => u.id === s.userId) ?? null;
}

export function setUserStatus(id: string, status: "approved" | "rejected") {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return;
  users[idx].status = status;
  users[idx].active = status === "approved";
  saveUsers(users);
}

export function staffForHospital(code: string) {
  return getUsers().filter((u) => u.hospitalCode === code);
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
