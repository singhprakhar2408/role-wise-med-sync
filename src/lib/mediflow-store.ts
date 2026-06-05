// MediFlow Clinical — frontend-only mock auth & data store (localStorage)
// Hospital codes are isolated. Staff requests need Host/Admin approval.

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
  password: string;
  status: "pending" | "approved" | "rejected";
  active: boolean;
  createdAt: number;
}

export const DOCTOR_SPECIALTIES = [
  "General Medicine", "Cardiology", "Neurology", "Orthopedics",
  "Pediatrics", "Gynecology", "Dermatology", "ENT",
  "Ophthalmology", "Psychiatry", "Pulmonology", "Gastroenterology",
  "Nephrology", "Oncology", "Endocrinology", "General Surgery",
] as const;

export interface Session {
  userId: string;
  hospitalCode: string;
}

const KEY_USERS = "mediflow.users";
const KEY_SESSION = "mediflow.session";
const KEY_HOSPITALS = "mediflow.hospitals";

const SEED_HOSPITALS = [
  { code: "HOSP001", name: "MediFlow General Hospital" },
  { code: "HOSP002", name: "Apollo Care Center" },
  { code: "HOSP003", name: "City Heart Institute" },
];

export interface Hospital { code: string; name: string }

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

export function getHospitals(): Hospital[] {
  const list = read<Hospital[]>(KEY_HOSPITALS, []);
  if (list.length === 0) { write(KEY_HOSPITALS, SEED_HOSPITALS); return SEED_HOSPITALS; }
  return list;
}

export function validHospitalCode(code: string): Hospital | undefined {
  return getHospitals().find(h => h.code.toLowerCase() === code.trim().toLowerCase());
}

export function getUsers(): StaffAccount[] { return read(KEY_USERS, [] as StaffAccount[]); }
function saveUsers(u: StaffAccount[]) { write(KEY_USERS, u); }

function ensureSeedAdmin(hospitalCode: string) {
  const users = getUsers();
  const has = users.some(u => u.hospitalCode === hospitalCode && u.role === "host_admin");
  if (!has) {
    users.push({
      id: crypto.randomUUID(),
      hospitalCode,
      fullName: "Hospital Admin",
      email: `admin@${hospitalCode.toLowerCase()}.med`,
      mobile: "+91 9000000000",
      role: "host_admin",
      department: "Administration",
      password: "admin123",
      status: "approved",
      active: true,
      createdAt: Date.now(),
    });
    saveUsers(users);
  }
}

export function registerStaff(input: Omit<StaffAccount, "id" | "status" | "active" | "createdAt">): StaffAccount {
  ensureSeedAdmin(input.hospitalCode);
  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === input.email.toLowerCase() && u.hospitalCode === input.hospitalCode)) {
    throw new Error("An account with this email already exists for this hospital.");
  }
  const acct: StaffAccount = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending",
    active: false,
    createdAt: Date.now(),
  };
  users.push(acct);
  saveUsers(users);
  return acct;
}

export function loginStaff(hospitalCode: string, email: string, password: string, remember: boolean): StaffAccount {
  ensureSeedAdmin(hospitalCode);
  const users = getUsers();
  const u = users.find(x =>
    x.hospitalCode === hospitalCode &&
    x.email.toLowerCase() === email.trim().toLowerCase() &&
    x.password === password,
  );
  if (!u) throw new Error("Invalid credentials.");
  if (u.status !== "approved" || !u.active) throw new Error("Your account is awaiting Host/Admin approval.");
  const session: Session = { userId: u.id, hospitalCode };
  if (remember) localStorage.setItem(KEY_SESSION, JSON.stringify(session));
  else sessionStorage.setItem(KEY_SESSION, JSON.stringify(session));
  return u;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY_SESSION) || sessionStorage.getItem(KEY_SESSION);
  return raw ? JSON.parse(raw) as Session : null;
}

export function logout() {
  localStorage.removeItem(KEY_SESSION);
  sessionStorage.removeItem(KEY_SESSION);
}

export function currentUser(): StaffAccount | null {
  const s = getSession();
  if (!s) return null;
  return getUsers().find(u => u.id === s.userId) ?? null;
}

export function setUserStatus(id: string, status: "approved" | "rejected") {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return;
  users[idx].status = status;
  users[idx].active = status === "approved";
  saveUsers(users);
}

export function staffForHospital(code: string) {
  return getUsers().filter(u => u.hospitalCode === code);
}
