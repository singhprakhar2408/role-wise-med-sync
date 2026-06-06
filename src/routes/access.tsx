import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/AppShell";
import {
  listHospitals,
  loginStaff,
  registerStaff,
  verifyHospitalCode,
  DOCTOR_SPECIALTIES,
  REGISTRABLE_ROLES,
  ROLE_LABEL,
  type Hospital,
  type Role,
} from "@/lib/mediflow-store";


export const Route = createFileRoute("/access")({
  head: () => ({ meta: [{ title: "Hospital Access — MediFlow Clinical" }] }),
  component: Access,
});

type Step = "intro" | "choose" | "login" | "register" | "submitted";

function Access() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [hospitalCode, setHospitalCode] = useState("");
  const [hospitalErr, setHospitalErr] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [configuredHospitals, setConfiguredHospitals] = useState<Hospital[]>([]);

  useEffect(() => {
    listHospitals().then(setConfiguredHospitals).catch(() => setConfiguredHospitals([]));
  }, []);

  const goVerify = async () => {
    setVerifying(true);
    try {
      await verifyHospitalCode(hospitalCode);
      setHospitalErr("");
      setStep("choose");
    } catch (e: unknown) {
      setHospitalErr((e as Error).message);
    } finally {
      setVerifying(false);
    }
  };


  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-32 size-[500px] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 size-[500px] rounded-full bg-accent/20 blur-3xl" />

      <header className="relative px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <BrandMark />
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
          Back
        </Link>
      </header>

      <div className="relative max-w-7xl mx-auto px-6 pb-16 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
        {/* Left — intro */}
        <section className="animate-fade-up">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success animate-pulse-glow" /> Secure hospital
            access
          </div>
          <h1 className="mt-5 text-4xl lg:text-5xl leading-[1.05]">
            One <span className="gradient-text">digital operating system</span>
            <br /> for your entire hospital.
          </h1>
          <p className="mt-5 text-muted-foreground max-w-xl">
            MediFlow Clinical connects compounder intake, doctor consultation, laboratory reports,
            pharmacy dispensing, patient records, and host/admin verification into one secure,
            role-based workflow — no WhatsApp updates, no paper files, no scattered responsibility.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 gap-3">
            {[
              [
                "Private hospital codes",
                "Hospital data stays isolated. Staff from one hospital can never see another's records.",
              ],
              [
                "Role-based panels",
                "Compounder, Doctor, Lab, Pharmacy, Records, Host/Admin — each sees only what they need.",
              ],
              [
                "AI suggestion bank",
                "Every symptom, test, medicine and dose you add becomes a smart suggestion for next time.",
              ],
              [
                "Real-time queues",
                "Patients flow from intake → doctor → lab → pharmacy with live status across the hospital.",
              ],
            ].map(([t, d]) => (
              <div key={t} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {t}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{d}</p>
              </div>
            ))}
          </div>

          {configuredHospitals.length === 0 && (
            <div className="mt-8 glass rounded-2xl p-4 text-xs leading-relaxed text-warning">
              No hospital access codes are configured for this deployment yet. Configure the
              production backend or set <span className="font-mono">VITE_MEDIFLOW_HOSPITALS</span>{" "}
              before publishing staff access.
            </div>
          )}
        </section>

        {/* Right — access card */}
        <section className="lg:sticky lg:top-6">
          <div className="glass-strong rounded-3xl p-6 lg:p-8">
            {step === "intro" || step === "choose" ? (
              <>
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Step 1
                </div>
                <h2 className="mt-1 text-2xl">Enter your hospital code</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every hospital has a unique private access code.
                </p>

                <label className="block mt-6 text-xs uppercase tracking-wider text-muted-foreground">
                  Hospital code
                </label>
                <input
                  value={hospitalCode}
                  onChange={(e) => setHospitalCode(e.target.value.toUpperCase())}
                  placeholder="HOSPITAL-CODE"
                  className="mt-2 w-full bg-input/60 border border-white/10 rounded-xl px-4 py-3.5 text-lg font-mono tracking-widest ring-focus"
                />
                {hospitalErr && <div className="mt-2 text-xs text-destructive">{hospitalErr}</div>}

                <button
                  onClick={goVerify}
                  className="btn-primary mt-5 w-full rounded-xl px-4 py-3.5 font-medium"
                >
                  Verify hospital →
                </button>

                {step === "choose" && (
                  <div className="mt-7 pt-6 border-t border-white/10">
                    <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Step 2
                    </div>
                    <h3 className="mt-1 text-lg">Choose how to continue</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[1.08fr_0.92fr]">
                      <button
                        onClick={() => setStep("login")}
                        className="rounded-2xl border border-primary/35 bg-primary/10 p-4 text-left shadow-[0_12px_34px_-22px_var(--ring)] transition-colors hover:border-primary/60 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/[0.18] text-primary">
                            <Mail className="size-4" aria-hidden="true" />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold">Existing staff</span>
                            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                              Use your email and password for this hospital.
                            </span>
                          </span>
                        </div>
                        <div className="mt-4 rounded-xl bg-white/[0.07] px-3 py-2 text-xs font-medium text-primary">
                          Email and password sign-in
                        </div>
                      </button>
                      <button
                        onClick={() => setStep("register")}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-muted-foreground">
                            <UserPlus className="size-4" aria-hidden="true" />
                          </span>
                          <span>
                            <span className="block text-sm font-medium">New staff</span>
                            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                              Register and wait for admin approval.
                            </span>
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : step === "login" ? (
              <LoginForm
                hospitalCode={hospitalCode}
                onDone={(role) => router.navigate({ to: roleHome(role) })}
                onBack={() => setStep("choose")}
              />
            ) : step === "register" ? (
              <RegisterForm
                hospitalCode={hospitalCode}
                onDone={() => setStep("submitted")}
                onBack={() => setStep("choose")}
              />
            ) : (
              <Submitted onReturn={() => setStep("choose")} />
            )}
          </div>
          <div className="mt-3 text-center text-[11px] text-muted-foreground">
            Staff access is restricted to approved hospital accounts.
          </div>
        </section>
      </div>
    </div>
  );
}

function roleHome(role: Role) {
  switch (role) {
    case "super_admin":
    case "hospital_admin":
      return "/dashboard";
    case "doctor":
      return "/doctor";
    case "compounder":
      return "/compounder";
    case "lab":
      return "/lab";
    case "pharmacist":
      return "/pharmacy";
    case "records_viewer":
      return "/records";
  }
}


function LoginForm({
  hospitalCode,
  onDone,
  onBack,
}: {
  hospitalCode: string;
  onDone: (r: Role) => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          const u = await loginStaff(hospitalCode, email, password, remember);
          onDone(u.role);
        } catch (x: unknown) {
          setErr((x as Error).message);
        } finally {
          setLoading(false);
        }
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to options
      </button>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Existing staff
          </div>
          <h2 className="mt-1 text-2xl">Sign in with email</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Use the staff email and password approved for this hospital.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs text-primary">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          <span className="font-mono">{hospitalCode}</span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <div className="space-y-4">
          <Field label="Email address">
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErr("");
                }}
                placeholder="name@hospital.org"
                autoComplete="email"
                className="input pl-10"
              />
            </div>
          </Field>
          <Field label="Password">
            <div className="relative">
              <LockKeyhole
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErr("");
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="input pl-10 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </Field>
          <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-primary"
            />
            Keep me signed in on this device
          </label>
        </div>
      </div>

      {err && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {err}
        </div>
      )}
      <button
        disabled={loading}
        className="btn-primary mt-5 w-full rounded-xl px-4 py-3.5 font-semibold shadow-none disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in securely"}
      </button>
    </form>
  );
}

function RegisterForm({
  hospitalCode,
  onDone,
  onBack,
}: {
  hospitalCode: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const [f, setF] = useState({
    fullName: "",
    email: "",
    mobile: "",
    role: "doctor" as Role,
    department: "",
    specialty: "General Medicine",
    licenseNo: "",
    password: "",
    confirm: "",
  });
  const [err, setErr] = useState("");
  const [otpSent, setOtpSent] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sendOtp = () => {
    if (!f.mobile.trim()) {
      setErr("Enter your mobile number first.");
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setOtpSent(code);
    setErr("");
    toast.success(`OTP sent to ${f.mobile}`);
  };
  const verifyOtp = () => {
    if (otpInput.trim() === otpSent) {
      setOtpVerified(true);
      setErr("");
      toast.success("Mobile verified");
    } else {
      setErr("Invalid OTP. Try again.");
    }
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!otpVerified) {
          setErr("Please verify your mobile via OTP first.");
          return;
        }
        if (f.password !== f.confirm) {
          setErr("Passwords do not match.");
          return;
        }
        setSubmitting(true);
        try {
          const { specialty, ...base } = f;
          await registerStaff({
            ...base,
            hospitalCode,
            ...(base.role === "doctor" ? { specialty } : {}),
          });
          onDone();
        } catch (x: unknown) {
          setErr((x as Error).message);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Back
      </button>
      <h2 className="mt-2 text-2xl">New staff registration</h2>
      <p className="text-sm text-muted-foreground">
        Hospital <span className="font-mono text-primary">{hospitalCode}</span> · Approval required
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="Full name" full>
          <input
            required
            value={f.fullName}
            onChange={(e) => setF({ ...f, fullName: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            required
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Mobile">
          <div className="flex gap-2">
            <input
              required
              value={f.mobile}
              onChange={(e) => {
                setF({ ...f, mobile: e.target.value });
                setOtpVerified(false);
                setOtpSent(null);
              }}
              className="input flex-1"
            />
            <button
              type="button"
              onClick={sendOtp}
              disabled={otpVerified}
              className="rounded-xl px-3 text-xs border border-white/10 hover:bg-white/5 disabled:opacity-40 whitespace-nowrap"
            >
              {otpVerified ? "✓ Verified" : otpSent ? "Resend" : "Send OTP"}
            </button>
          </div>
        </Field>
        {otpSent && !otpVerified && (
          <Field label="Enter OTP" full>
            <div className="flex gap-2">
              <input
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                maxLength={6}
                placeholder="6-digit code"
                className="input flex-1 font-mono tracking-widest"
              />
              <button
                type="button"
                onClick={verifyOtp}
                className="rounded-xl px-4 text-xs btn-primary"
              >
                Verify
              </button>
            </div>
          </Field>
        )}
        <Field label="Role">
          <select
            value={f.role}
            onChange={(e) => setF({ ...f, role: e.target.value as Role })}
            className="input"
          >
            <option value="doctor">Doctor</option>
            <option value="compounder">Compounder</option>
            <option value="lab_technician">Lab Technician</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="records_viewer">Records Viewer</option>
          </select>
        </Field>
        <Field label="Department">
          <input
            required
            value={f.department}
            onChange={(e) => setF({ ...f, department: e.target.value })}
            className="input"
          />
        </Field>
        {f.role === "doctor" && (
          <Field label="Specialty / Field" full>
            <select
              value={f.specialty}
              onChange={(e) => setF({ ...f, specialty: e.target.value })}
              className="input"
            >
              {DOCTOR_SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="License / Reg. no.">
          <input
            value={f.licenseNo}
            onChange={(e) => setF({ ...f, licenseNo: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Confirm password">
          <input
            type="password"
            required
            value={f.confirm}
            onChange={(e) => setF({ ...f, confirm: e.target.value })}
            className="input"
          />
        </Field>
      </div>
      {err && <div className="mt-3 text-xs text-destructive">{err}</div>}
      <button
        disabled={submitting}
        className="btn-primary mt-5 w-full rounded-xl px-4 py-3 font-medium disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit for approval"}
      </button>
    </form>
  );
}

function Submitted({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="text-center py-6">
      <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center animate-pulse-glow">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="mt-5 text-2xl">Request submitted</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
        Your registration is pending Host/Admin approval. You'll be able to sign in once your
        account is approved.
      </p>
      <button onClick={onReturn} className="btn-primary mt-6 rounded-xl px-5 py-2.5 text-sm">
        Back to access
      </button>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
