import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SmartInput } from "@/components/SmartInput";
import { currentUser, staffForHospital, DOCTOR_SPECIALTIES } from "@/lib/mediflow-store";

export const Route = createFileRoute("/compounder")({
  head: () => ({ meta: [{ title: "Patient Intake — MediFlow Clinical" }] }),
  component: Compounder,
});

interface Intake {
  id: string; name: string; age: string; gender: string; mobile: string; complaint: string;
  bp: string; pulse: string; temp: string; spo2: string; weight: string; rr: string; symptoms: string;
  assignMode: "doctor" | "specialty";
  doctorId: string;
  specialty: string;
}

const empty: Omit<Intake, "id"> = {
  name: "", age: "", gender: "Male", mobile: "", complaint: "",
  bp: "", pulse: "", temp: "", spo2: "", weight: "", rr: "", symptoms: "",
  assignMode: "doctor", doctorId: "", specialty: "General Medicine",
};

interface SentIntake extends Intake { assignedTo: string; }

function Compounder() {
  const user = currentUser();
  const doctors = useMemo(
    () => user ? staffForHospital(user.hospitalCode).filter(s => s.role === "doctor" && s.active) : [],
    [user],
  );
  const [f, setF] = useState<Intake>({ ...empty, id: nextId(), doctorId: doctors[0]?.id ?? "" });
  const [queue, setQueue] = useState<SentIntake[]>([]);

  const reset = () => setF({ ...empty, id: nextId(), doctorId: doctors[0]?.id ?? "" });

  const send = () => {
    if (!f.name.trim()) { toast.error("Patient name is required"); return; }
    let assignedTo = "Next available doctor";
    if (f.assignMode === "doctor") {
      const d = doctors.find(x => x.id === f.doctorId);
      if (!d) { toast.error("Please select a doctor"); return; }
      assignedTo = `Dr. ${d.fullName}${d.specialty ? ` · ${d.specialty}` : ""}`;
    } else {
      assignedTo = `Specialty queue · ${f.specialty}`;
    }
    setQueue(q => [{ ...f, assignedTo }, ...q]);
    toast.success("Sent to doctor", { description: `${f.name} (#${f.id}) → ${assignedTo}` });
    reset();
  };

  return (
    <AppShell title="Compounder · Patient intake">
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="glass-strong rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">New patient</div>
              <h2 className="text-xl mt-0.5">Intake form <span className="text-primary font-mono text-sm ml-2">#{f.id}</span></h2>
            </div>
            <Link to="/records" className="text-xs glass rounded-full px-3 py-1.5 hover:bg-white/10">View all patient records →</Link>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Full name" wide><input value={f.name} onChange={e => setF({...f, name: e.target.value})} className="input" /></Field>
            <Field label="Age"><input value={f.age} onChange={e => setF({...f, age: e.target.value})} className="input" /></Field>
            <Field label="Gender">
              <select value={f.gender} onChange={e => setF({...f, gender: e.target.value})} className="input">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>
            <Field label="Mobile" wide><input value={f.mobile} onChange={e => setF({...f, mobile: e.target.value})} className="input" /></Field>
            <div className="col-span-2"><SmartInput label="Chief complaint" field="symptom" value={f.complaint} onChange={v => setF({...f, complaint: v})} /></div>
          </div>

          <div className="mt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Vitals</div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Field label="BP"><input value={f.bp} onChange={e => setF({...f, bp: e.target.value})} placeholder="120/80" className="input" /></Field>
              <Field label="Pulse"><input value={f.pulse} onChange={e => setF({...f, pulse: e.target.value})} className="input" /></Field>
              <Field label="Temp"><input value={f.temp} onChange={e => setF({...f, temp: e.target.value})} className="input" /></Field>
              <Field label="SpO₂"><input value={f.spo2} onChange={e => setF({...f, spo2: e.target.value})} className="input" /></Field>
              <Field label="Weight"><input value={f.weight} onChange={e => setF({...f, weight: e.target.value})} className="input" /></Field>
              <Field label="RR"><input value={f.rr} onChange={e => setF({...f, rr: e.target.value})} className="input" /></Field>
            </div>
          </div>

          <div className="mt-5">
            <SmartInput label="Other symptoms" field="symptom" value={f.symptoms} onChange={v => setF({...f, symptoms: v})} />
          </div>

          {/* Assign to doctor */}
          <div className="mt-5 glass rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Assign to doctor</div>
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={() => setF({...f, assignMode: "doctor"})}
                className={`text-xs px-3 py-1.5 rounded-lg border ${f.assignMode === "doctor" ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:bg-white/5"}`}>By name</button>
              <button type="button" onClick={() => setF({...f, assignMode: "specialty"})}
                className={`text-xs px-3 py-1.5 rounded-lg border ${f.assignMode === "specialty" ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:bg-white/5"}`}>By specialty / field</button>
            </div>
            {f.assignMode === "doctor" ? (
              doctors.length === 0 ? (
                <div className="text-xs text-muted-foreground">No approved doctors yet for this hospital.</div>
              ) : (
                <select value={f.doctorId} onChange={e => setF({...f, doctorId: e.target.value})} className="input">
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.fullName} {d.specialty ? `· ${d.specialty}` : ""}</option>
                  ))}
                </select>
              )
            ) : (
              <select value={f.specialty} onChange={e => setF({...f, specialty: e.target.value})} className="input">
                {DOCTOR_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <button onClick={send} className="btn-primary rounded-xl px-5 py-3 font-medium">Send to doctor →</button>
            <button onClick={reset} className="rounded-xl px-5 py-3 text-sm border border-white/10 hover:bg-white/5">Clear</button>
          </div>
          <style>{`.input{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:0.75rem;padding:0.55rem 0.85rem;font-size:0.875rem;color:inherit;outline:none}.input:focus{box-shadow:0 0 0 2px var(--background),0 0 0 4px var(--ring)}`}</style>
        </div>

        <div className="glass-strong rounded-2xl p-5">
          <h3 className="text-lg">Sent today <span className="text-xs text-muted-foreground">· {queue.length}</span></h3>
          <p className="text-xs text-muted-foreground">Patients you forwarded to the doctor queue.</p>
          <div className="mt-4 space-y-2 max-h-[560px] overflow-auto pr-1">
            {queue.length === 0 && <div className="text-sm text-muted-foreground glass rounded-xl p-4">Nothing yet.</div>}
            {queue.map(p => (
              <div key={p.id} className="glass rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">#{p.id} · {p.complaint || "—"}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/15 text-warning">waiting</span>
                </div>
                <div className="mt-2 text-[11px] text-primary">→ {p.assignedTo}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "col-span-2" : ""}`}>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function nextId() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `P-${n}`;
}
