import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SmartInput } from "@/components/SmartInput";

export const Route = createFileRoute("/doctor")({
  head: () => ({ meta: [{ title: "Doctor Queue — MediFlow Clinical" }] }),
  component: Doctor,
});

type Status = "waiting_for_doctor" | "under_review" | "lab_pending" | "lab_report_received" | "pharmacy_pending" | "closed";

interface QP {
  id: string; name: string; age: number; gender: string; complaint: string; status: Status;
  bp?: string; pulse?: string; temp?: string; spo2?: string; weight?: string; allergies?: string; history?: string;
}

const seed: QP[] = [
  { id: "P-1290", name: "Aarav Sharma", age: 54, gender: "M", complaint: "Chest pain, sweating", status: "waiting_for_doctor", bp: "150/96", pulse: "104", temp: "98.7", spo2: "96%", weight: "78kg", allergies: "Penicillin", history: "Hypertension since 2018, smoker." },
  { id: "P-1291", name: "Sara Khan", age: 32, gender: "F", complaint: "Fever, cough 3 days", status: "waiting_for_doctor", bp: "118/76", pulse: "92", temp: "101.2", spo2: "98%", weight: "58kg", allergies: "None", history: "No chronic illness." },
  { id: "P-1287", name: "Rahul Verma", age: 41, gender: "M", complaint: "Headache, BP 160/100", status: "lab_pending", bp: "160/100", pulse: "88", temp: "98.4", spo2: "99%", weight: "82kg", allergies: "Sulfa", history: "Family history of stroke." },
  { id: "P-1284", name: "Priya Iyer", age: 28, gender: "F", complaint: "Abdominal pain", status: "lab_report_received", bp: "110/72", pulse: "84", temp: "99.0", spo2: "99%", weight: "54kg", allergies: "None", history: "Gastritis." },
];

const STATUS_TONE: Record<Status, string> = {
  waiting_for_doctor: "bg-warning/15 text-warning",
  under_review: "bg-primary/15 text-primary",
  lab_pending: "bg-accent/15 text-accent",
  lab_report_received: "bg-success/20 text-success ring-1 ring-success/40",
  pharmacy_pending: "bg-accent/15 text-accent",
  closed: "bg-white/10 text-muted-foreground",
};

// Distinct row highlight when lab report has arrived
const ROW_TONE: Partial<Record<Status, string>> = {
  lab_report_received: "ring-1 ring-success/60 bg-success/10",
};

const TABS = ["Review", "Tests", "Prescription", "History"] as const;
type Tab = typeof TABS[number];

function Doctor() {
  const [queue, setQueue] = useState<QP[]>(seed);
  const [selected, setSelected] = useState<string | null>(seed[0].id);
  const [tab, setTab] = useState<Tab>("Review");
  const [closeOpen, setCloseOpen] = useState(false);

  const p = queue.find(q => q.id === selected) ?? null;
  const setStatus = (id: string, s: Status) =>
    setQueue(q => q.map(x => x.id === id ? { ...x, status: s } : x));
  const removeFromQueue = (id: string) =>
    setQueue(q => q.filter(x => x.id !== id));

  const onClosed = (mode: "followup" | "admit" | "all_fine", extra?: string) => {
    if (!p) return;
    setStatus(p.id, "closed");
    setCloseOpen(false);
    if (mode === "followup") toast.success("File closed · Follow-up scheduled", { description: `${p.name} → ${extra}` });
    else if (mode === "admit") toast.success("Patient admitted", { description: `${p.name} transferred to Receptionist for admission.` });
    else toast.success("File closed", { description: `${p.name} · All fine, no follow-up needed.` });
    // refresh selection
    const next = queue.find(x => x.id !== p.id && x.status !== "closed");
    setSelected(next?.id ?? null);
    setTab("Review");
  };

  return (
    <AppShell title="Doctor · Clinical workspace">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="glass rounded-full px-3 py-1.5">Total in queue: <span className="text-primary font-semibold">{queue.length}</span></span>
        <span className="glass rounded-full px-3 py-1.5">Awaiting review: <span className="text-warning font-semibold">{queue.filter(q => q.status === "waiting_for_doctor").length}</span></span>
        <span className="glass rounded-full px-3 py-1.5">Lab pending: <span className="text-accent font-semibold">{queue.filter(q => q.status === "lab_pending").length}</span></span>
        <span className="glass rounded-full px-3 py-1.5">Reports back: <span className="text-success font-semibold">{queue.filter(q => q.status === "lab_report_received").length}</span></span>
        <Link to="/records" className="glass rounded-full px-3 py-1.5 hover:bg-white/10">Full patient records →</Link>
      </div>
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        {/* Queue */}
        <aside className="glass-strong rounded-2xl p-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Patient queue</h2>
            <span className="text-xs text-primary">{queue.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {queue.map(qp => (
              <button key={qp.id} onClick={() => { setSelected(qp.id); setTab("Review"); }}
                className={`w-full text-left glass rounded-xl p-3 transition ${selected === qp.id ? "ring-1 ring-primary/50" : "hover:bg-white/10"} ${ROW_TONE[qp.status] ?? ""}`}>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[11px] text-primary">{qp.id}</div>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_TONE[qp.status]}`}>{qp.status.replace(/_/g, " ")}</span>
                </div>
                <div className="mt-1 text-sm font-medium truncate">{qp.name} <span className="text-muted-foreground text-xs">· {qp.age}/{qp.gender}</span></div>
                <div className="text-[11px] text-muted-foreground truncate">{qp.complaint}</div>
                {qp.status === "lab_report_received" && (
                  <div className="mt-1.5 text-[10px] uppercase tracking-wider text-success animate-pulse">● Lab report ready</div>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Detail */}
        <section className="glass-strong rounded-2xl p-5">
          {!p ? <div className="text-muted-foreground text-sm">Select a patient.</div> : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-primary">{p.id}</div>
                  <h2 className="text-xl mt-0.5">{p.name} <span className="text-muted-foreground text-sm">· {p.age}/{p.gender}</span></h2>
                  <div className="text-sm text-muted-foreground">{p.complaint}</div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_TONE[p.status]}`}>{p.status.replace(/_/g, " ")}</span>
              </div>

              {/* Full detailed patient record snapshot */}
              <div className="mt-4 grid sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <Mini k="BP" v={p.bp} /> <Mini k="Pulse" v={p.pulse} />
                <Mini k="Temp" v={p.temp} /> <Mini k="SpO₂" v={p.spo2} />
                <Mini k="Weight" v={p.weight} /> <Mini k="Allergies" v={p.allergies} />
                <Mini k="History" v={p.history} wide />
              </div>

              {/* Tabs */}
              <div className="mt-5 flex gap-1 overflow-x-auto glass rounded-xl p-1">
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap ${tab === t ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                {tab === "Review" && <Review />}
                {tab === "Tests" && <Tests onSent={() => { setStatus(p.id, "lab_pending"); toast.success("Sent to Laboratory", { description: `${p.name} · awaiting reports` }); }} />}
                {tab === "Prescription" && <Prescription onSent={() => { setStatus(p.id, "pharmacy_pending"); toast.success("Sent to Pharmacy", { description: `${p.name} · prescription queued` }); }} />}
                {tab === "History" && <History />}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button onClick={() => setCloseOpen(true)} className="btn-primary rounded-xl px-4 py-2 text-sm">Close file</button>
              </div>
            </>
          )}
        </section>
      </div>

      {closeOpen && p && (
        <CloseFileModal patient={p} onClose={() => setCloseOpen(false)} onDone={onClosed} onAdmitted={() => removeFromQueue(p.id)} />
      )}
    </AppShell>
  );
}

function Mini({ k, v, wide }: { k: string; v?: string; wide?: boolean }) {
  return (
    <div className={`glass rounded-lg px-3 py-2 ${wide ? "sm:col-span-2 md:col-span-4" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="text-sm">{v || "—"}</div>
    </div>
  );
}

function Review() {
  const [diagnosis, setDiagnosis] = useState("");
  const [system, setSystem] = useState("");
  const [organ, setOrgan] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <SmartInput label="Working diagnosis" field="diagnosis" value={diagnosis} onChange={setDiagnosis} />
      <SmartInput label="Body system" field="body_system" value={system} onChange={setSystem} />
      <SmartInput label="Organ / deep part" field="organ" value={organ} onChange={setOrgan} />
      <SmartInput label="Add symptom" field="symptom" value={""} onChange={() => {}} />
      <label className="md:col-span-2 block">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Doctor notes</span>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
          className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm ring-focus" />
      </label>
    </div>
  );
}

function Tests({ onSent }: { onSent: () => void }) {
  const [list, setList] = useState<string[]>([]);
  const [t, setT] = useState("");
  const send = () => {
    if (list.length === 0) { toast.error("Add at least one test"); return; }
    onSent();
    setList([]); setT("");
  };
  return (
    <div>
      <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
        <SmartInput label="Add test" field="test" value={t} onChange={setT} />
        <button onClick={() => { if (t.trim()) { setList([...list, t]); setT(""); } }} className="rounded-xl px-4 py-2.5 text-sm border border-white/10 hover:bg-white/5">Add</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {list.map((x, i) => (
          <span key={i} className="glass rounded-full px-3 py-1.5 text-xs flex items-center gap-2">
            {x}
            <button onClick={() => setList(list.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">×</button>
          </span>
        ))}
        {list.length === 0 && <span className="text-xs text-muted-foreground">No tests added.</span>}
      </div>
      <button onClick={send} className="btn-primary mt-5 rounded-xl px-5 py-2.5 text-sm">Send to Laboratory →</button>
    </div>
  );
}

function Prescription({ onSent }: { onSent: () => void }) {
  const [rows, setRows] = useState<Array<{ med: string; salt: string; dose: string; freq: string; days: string; route: string; instr: string }>>(
    [{ med: "", salt: "", dose: "", freq: "", days: "", route: "", instr: "" }]
  );
  const update = (i: number, k: string, v: string) => setRows(r => r.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const send = () => {
    if (!rows.some(r => r.med.trim())) { toast.error("Add at least one medicine"); return; }
    onSent();
    setRows([{ med: "", salt: "", dose: "", freq: "", days: "", route: "", instr: "" }]);
  };
  return (
    <div>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="glass rounded-xl p-3 grid grid-cols-2 md:grid-cols-7 gap-2">
            <SmartInput field="medicine" value={r.med} onChange={v => update(i, "med", v)} placeholder="Medicine" />
            <SmartInput field="salt" value={r.salt} onChange={v => update(i, "salt", v)} placeholder="Salt" />
            <input value={r.dose} onChange={e => update(i, "dose", e.target.value)} placeholder="Dose" className="input" />
            <SmartInput field="frequency" value={r.freq} onChange={v => update(i, "freq", v)} placeholder="Freq" />
            <input value={r.days} onChange={e => update(i, "days", e.target.value)} placeholder="Days" className="input" />
            <SmartInput field="route" value={r.route} onChange={v => update(i, "route", v)} placeholder="Route" />
            <input value={r.instr} onChange={e => update(i, "instr", e.target.value)} placeholder="Instruction" className="input col-span-2 md:col-span-1" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setRows([...rows, { med: "", salt: "", dose: "", freq: "", days: "", route: "", instr: "" }])} className="rounded-xl px-4 py-2 text-sm border border-white/10 hover:bg-white/5">+ Add medicine</button>
        <button onClick={send} className="btn-primary rounded-xl px-5 py-2 text-sm">Send to Pharmacy →</button>
      </div>
      <style>{`.input{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:0.75rem;padding:0.55rem 0.85rem;font-size:0.8125rem;color:inherit;outline:none}`}</style>
    </div>
  );
}

function History() {
  const items = [
    { d: "Today", t: "Intake recorded by Compounder Riya", c: "BP 130/82 · Pulse 88 · Temp 99.1" },
    { d: "Yesterday", t: "Last visit · Dr. Mehta", c: "URTI · Paracetamol 500 BD × 5d" },
    { d: "Mar 12", t: "Lab report uploaded", c: "CBC within normal limits" },
  ];
  return (
    <ol className="relative border-l border-white/10 pl-5 space-y-4">
      {items.map((i, k) => (
        <li key={k}>
          <span className="absolute -left-1.5 size-3 rounded-full bg-primary shadow-[0_0_12px] shadow-primary" />
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{i.d}</div>
          <div className="text-sm">{i.t}</div>
          <div className="text-xs text-muted-foreground">{i.c}</div>
        </li>
      ))}
    </ol>
  );
}

function CloseFileModal({
  patient, onClose, onDone, onAdmitted,
}: {
  patient: QP;
  onClose: () => void;
  onDone: (mode: "followup" | "admit" | "all_fine", extra?: string) => void;
  onAdmitted: () => void;
}) {
  const [choice, setChoice] = useState<"followup" | "admit" | "all_fine" | null>(null);
  const [followDate, setFollowDate] = useState("");
  const [admitWard, setAdmitWard] = useState("General Ward");
  const [admitNote, setAdmitNote] = useState("");

  const confirm = () => {
    if (choice === "followup") {
      if (!followDate) { toast.error("Pick a follow-up date"); return; }
      onDone("followup", new Date(followDate).toLocaleString());
    } else if (choice === "admit") {
      toast.success("Transferred to Receptionist", { description: `${patient.name} · ${admitWard}` });
      onAdmitted();
      onDone("admit", admitWard);
    } else if (choice === "all_fine") {
      onDone("all_fine");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 max-w-lg w-full animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Close file · {patient.id}</div>
        <h3 className="mt-1 text-xl">How are you closing {patient.name}?</h3>
        <div className="mt-5 space-y-2">
          <Opt active={choice === "followup"} onClick={() => setChoice("followup")} title="Follow-up required" desc="Patient needs to return for review. Choose a date & time." />
          <Opt active={choice === "admit"} onClick={() => setChoice("admit")} title="Admit to hospital" desc="Transfer to Receptionist for ward admission." />
          <Opt active={choice === "all_fine"} onClick={() => setChoice("all_fine")} title="All fine · no follow-up" desc="Treatment complete, discharge from active queue." />
        </div>

        {choice === "followup" && (
          <div className="mt-4 glass rounded-xl p-3">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Follow-up date & time</label>
            <input type="datetime-local" value={followDate} onChange={e => setFollowDate(e.target.value)}
              className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm ring-focus" />
          </div>
        )}
        {choice === "admit" && (
          <div className="mt-4 glass rounded-xl p-3 space-y-2">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Ward</span>
              <select value={admitWard} onChange={e => setAdmitWard(e.target.value)}
                className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm">
                <option>General Ward</option><option>ICU</option><option>HDU</option><option>Surgical Ward</option><option>Pediatric Ward</option><option>Maternity</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Note for receptionist</span>
              <textarea value={admitNote} onChange={e => setAdmitNote(e.target.value)} rows={2}
                className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg hover:bg-white/5">Cancel</button>
          <button onClick={confirm} disabled={!choice} className="btn-primary text-sm px-5 py-2 rounded-lg disabled:opacity-40">Confirm</button>
        </div>
      </div>
    </div>
  );
}

function Opt({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button onClick={onClick} className={`w-full text-left glass rounded-xl p-3 transition ${active ? "ring-1 ring-primary/60 bg-primary/10" : "hover:bg-white/10"}`}>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
    </button>
  );
}
