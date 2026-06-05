import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/AppShell";
import { getHospitals, loginStaff, registerStaff, validHospitalCode, DOCTOR_SPECIALTIES, type Role } from "@/lib/mediflow-store";

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

  const goVerify = () => {
    const found = validHospitalCode(hospitalCode);
    if (!found) { setHospitalErr("Invalid hospital code. Try HOSP001, HOSP002 or HOSP003."); return; }
    setHospitalErr("");
    setStep("choose");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-32 size-[500px] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 size-[500px] rounded-full bg-accent/20 blur-3xl" />

      <header className="relative px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <BrandMark />
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Back</Link>
      </header>

      <div className="relative max-w-7xl mx-auto px-6 pb-16 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
        {/* Left — intro */}
        <section className="animate-fade-up">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success animate-pulse-glow" /> Secure hospital access
          </div>
          <h1 className="mt-5 text-4xl lg:text-5xl leading-[1.05]">
            One <span className="gradient-text">digital operating system</span><br/> for your entire hospital.
          </h1>
          <p className="mt-5 text-muted-foreground max-w-xl">
            MediFlow Clinical connects compounder intake, doctor consultation, laboratory reports, pharmacy
            dispensing, patient records, and host/admin verification into one secure, role-based workflow —
            no WhatsApp updates, no paper files, no scattered responsibility.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 gap-3">
            {[
              ["Private hospital codes", "Hospital data stays isolated. Staff from one hospital can never see another's records."],
              ["Role-based panels", "Compounder, Doctor, Lab, Pharmacy, Records, Host/Admin — each sees only what they need."],
              ["AI suggestion bank", "Every symptom, test, medicine and dose you add becomes a smart suggestion for next time."],
              ["Real-time queues", "Patients flow from intake → doctor → lab → pharmacy with live status across the hospital."],
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

          <div className="mt-8 glass rounded-2xl p-4 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Demo hospitals: </span>
            {getHospitals().map(h => (
              <button
                key={h.code}
                onClick={() => { setHospitalCode(h.code); setHospitalErr(""); }}
                className="inline-flex items-center gap-1.5 mr-2 mt-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition"
              >
                <span className="text-primary font-mono">{h.code}</span>
                <span className="opacity-70">· {h.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Right — access card */}
        <section className="lg:sticky lg:top-6 animate-fade-up">
          <div className="glass-strong rounded-3xl p-6 lg:p-8">
            {step === "intro" || step === "choose" ? (
              <>
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Step 1</div>
                <h2 className="mt-1 text-2xl">Enter your hospital code</h2>
                <p className="mt-1 text-sm text-muted-foreground">Every hospital has a unique private access code.</p>

                <label className="block mt-6 text-xs uppercase tracking-wider text-muted-foreground">Hospital code</label>
                <input
                  value={hospitalCode}
                  onChange={e => setHospitalCode(e.target.value.toUpperCase())}
                  placeholder="HOSP001"
                  className="mt-2 w-full bg-input/60 border border-white/10 rounded-xl px-4 py-3.5 text-lg font-mono tracking-widest ring-focus"
                />
                {hospitalErr && <div className="mt-2 text-xs text-destructive">{hospitalErr}</div>}

                <button onClick={goVerify} className="btn-primary mt-5 w-full rounded-xl px-4 py-3.5 font-medium">
                  Verify hospital →
                </button>

                {step === "choose" && (
                  <div className="mt-7 pt-6 border-t border-white/10">
                    <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Step 2</div>
                    <h3 className="mt-1 text-lg">Choose how to continue</h3>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button onClick={() => setStep("login")} className="glass rounded-xl p-4 text-left hover:bg-white/10 transition">
                        <div className="text-sm font-medium">Existing staff</div>
                        <div className="text-xs text-muted-foreground mt-1">Sign in with your email and password.</div>
                      </button>
                      <button onClick={() => setStep("register")} className="glass rounded-xl p-4 text-left hover:bg-white/10 transition">
                        <div className="text-sm font-medium">New staff</div>
                        <div className="text-xs text-muted-foreground mt-1">Register and wait for admin approval.</div>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : step === "login" ? (
              <LoginForm hospitalCode={hospitalCode} onDone={(role) => router.navigate({ to: roleHome(role) })} onBack={() => setStep("choose")} />
            ) : step === "register" ? (
              <RegisterForm hospitalCode={hospitalCode} onDone={() => setStep("submitted")} onBack={() => setStep("choose")} />
            ) : (
              <Submitted onReturn={() => setStep("choose")} />
            )}
          </div>
          <div className="mt-3 text-center text-[11px] text-muted-foreground">
            Seeded admin per hospital · email: <span className="font-mono">admin@hospXXX.med</span> · pass: <span className="font-mono">admin123</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function roleHome(role: Role) {
  switch (role) {
    case "host_admin": return "/dashboard";
    case "doctor": return "/doctor";
    case "compounder": return "/compounder";
    case "lab_technician": return "/lab";
    case "pharmacist": return "/pharmacy";
    case "records_viewer": return "/records";
  }
}

function LoginForm({ hospitalCode, onDone, onBack }: { hospitalCode: string; onDone: (r: Role) => void; onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");

  return (
    <form onSubmit={e => { e.preventDefault(); try { const u = loginStaff(hospitalCode, email, password, remember); onDone(u.role); } catch (x: unknown) { setErr((x as Error).message); } }}>
      <button type="button" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
      <h2 className="mt-2 text-2xl">Sign in</h2>
      <p className="text-sm text-muted-foreground">Hospital <span className="font-mono text-primary">{hospitalCode}</span></p>

      <div className="mt-5 space-y-3">
        <Field label="Email"><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" /></Field>
        <Field label="Password"><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input" /></Field>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="accent-primary" />
          Keep me signed in on this device
        </label>
      </div>
      {err && <div className="mt-3 text-xs text-destructive">{err}</div>}
      <button className="btn-primary mt-5 w-full rounded-xl px-4 py-3 font-medium">Sign in</button>
    </form>
  );
}

function RegisterForm({ hospitalCode, onDone, onBack }: { hospitalCode: string; onDone: () => void; onBack: () => void }) {
  const [f, setF] = useState({ fullName: "", email: "", mobile: "", role: "doctor" as Role, department: "", specialty: "General Medicine", licenseNo: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [otpSent, setOtpSent] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const sendOtp = () => {
    if (!f.mobile.trim()) { setErr("Enter your mobile number first."); return; }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setOtpSent(code);
    setErr("");
    toast.success(`OTP sent to ${f.mobile}`, { description: `Demo code: ${code}` });
  };
  const verifyOtp = () => {
    if (otpInput.trim() === otpSent) { setOtpVerified(true); setErr(""); toast.success("Mobile verified"); }
    else { setErr("Invalid OTP. Try again."); }
  };

  return (
    <form onSubmit={e => {
      e.preventDefault();
      if (!otpVerified) { setErr("Please verify your mobile via OTP first."); return; }
      if (f.password !== f.confirm) { setErr("Passwords do not match."); return; }
      try {
        const payload = { ...f };
        if (payload.role !== "doctor") delete (payload as Partial<typeof payload>).specialty;
        registerStaff({ ...payload, hospitalCode });
        onDone();
      } catch (x: unknown) { setErr((x as Error).message); }
    }}>
      <button type="button" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
      <h2 className="mt-2 text-2xl">New staff registration</h2>
      <p className="text-sm text-muted-foreground">Hospital <span className="font-mono text-primary">{hospitalCode}</span> · Approval required</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="Full name" full><input required value={f.fullName} onChange={e => setF({ ...f, fullName: e.target.value })} className="input" /></Field>
        <Field label="Email"><input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} className="input" /></Field>
        <Field label="Mobile">
          <div className="flex gap-2">
            <input required value={f.mobile} onChange={e => { setF({ ...f, mobile: e.target.value }); setOtpVerified(false); setOtpSent(null); }} className="input flex-1" />
            <button type="button" onClick={sendOtp} disabled={otpVerified} className="rounded-xl px-3 text-xs border border-white/10 hover:bg-white/5 disabled:opacity-40 whitespace-nowrap">
              {otpVerified ? "✓ Verified" : otpSent ? "Resend" : "Send OTP"}
            </button>
          </div>
        </Field>
        {otpSent && !otpVerified && (
          <Field label="Enter OTP" full>
            <div className="flex gap-2">
              <input value={otpInput} onChange={e => setOtpInput(e.target.value)} maxLength={6} placeholder="6-digit code" className="input flex-1 font-mono tracking-widest" />
              <button type="button" onClick={verifyOtp} className="rounded-xl px-4 text-xs btn-primary">Verify</button>
            </div>
          </Field>
        )}
        <Field label="Role">
          <select value={f.role} onChange={e => setF({ ...f, role: e.target.value as Role })} className="input">
            <option value="doctor">Doctor</option>
            <option value="compounder">Compounder</option>
            <option value="lab_technician">Lab Technician</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="records_viewer">Records Viewer</option>
            <option value="host_admin">Host / Admin</option>
          </select>
        </Field>
        <Field label="Department"><input required value={f.department} onChange={e => setF({ ...f, department: e.target.value })} className="input" /></Field>
        {f.role === "doctor" && (
          <Field label="Specialty / Field" full>
            <select value={f.specialty} onChange={e => setF({ ...f, specialty: e.target.value })} className="input">
              {DOCTOR_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <Field label="License / Reg. no."><input value={f.licenseNo} onChange={e => setF({ ...f, licenseNo: e.target.value })} className="input" /></Field>
        <Field label="Password"><input type="password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} className="input" /></Field>
        <Field label="Confirm password"><input type="password" required value={f.confirm} onChange={e => setF({ ...f, confirm: e.target.value })} className="input" /></Field>
      </div>
      {err && <div className="mt-3 text-xs text-destructive">{err}</div>}
      <button className="btn-primary mt-5 w-full rounded-xl px-4 py-3 font-medium">Submit for approval</button>

      <style>{`.input{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:0.75rem;padding:0.7rem 0.9rem;font-size:0.9rem;color:inherit;outline:none}.input:focus{box-shadow:0 0 0 2px var(--background),0 0 0 4px var(--ring)}`}</style>
    </form>
  );
}

function Submitted({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="text-center py-6">
      <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center animate-pulse-glow">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h2 className="mt-5 text-2xl">Request submitted</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
        Your registration is pending Host/Admin approval. You'll be able to sign in once your account is approved.
      </p>
      <button onClick={onReturn} className="btn-primary mt-6 rounded-xl px-5 py-2.5 text-sm">Back to access</button>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
