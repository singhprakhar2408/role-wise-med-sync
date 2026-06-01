import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SmartInput } from "@/components/SmartInput";

export const Route = createFileRoute("/doctor")({
  head: () => ({ meta: [{ title: "Doctor Queue — MediFlow Clinical" }] }),
  component: Doctor,
});

type Status = "waiting_for_doctor" | "under_review" | "lab_pending" | "lab_report_received" | "pharmacy_pending" | "closed";

interface QP { id: string; name: string; age: number; gender: string; complaint: string; status: Status; }

const seed: QP[] = [
  { id: "P-1290", name: "Aarav Sharma", age: 54, gender: "M", complaint: "Chest pain, sweating", status: "waiting_for_doctor" },
  { id: "P-1291", name: "Sara Khan", age: 32, gender: "F", complaint: "Fever, cough 3 days", status: "waiting_for_doctor" },
  { id: "P-1287", name: "Rahul Verma", age: 41, gender: "M", complaint: "Headache, BP 160/100", status: "lab_pending" },
  { id: "P-1284", name: "Priya Iyer", age: 28, gender: "F", complaint: "Abdominal pain", status: "lab_report_received" },
];

const STATUS_TONE: Record<Status, string> = {
  waiting_for_doctor: "bg-warning/15 text-warning",
  under_review: "bg-primary/15 text-primary",
  lab_pending: "bg-accent/15 text-accent",
  lab_report_received: "bg-success/15 text-success",
  pharmacy_pending: "bg-accent/15 text-accent",
  closed: "bg-white/10 text-muted-foreground",
};

const TABS = ["Queue", "Review", "Tests", "Prescription", "History"] as const;
type Tab = typeof TABS[number];

function Doctor() {
  const [queue, setQueue] = useState<QP[]>(seed);
  const [selected, setSelected] = useState<string | null>(seed[0].id);
  const [tab, setTab] = useState<Tab>("Queue");

  const p = queue.find(q => q.id === selected) ?? null;
  const setStatus = (id: string, s: Status) => setQueue(q => q.map(x => x.id === id ? { ...x, status: s } : x));

  return (
    <AppShell title="Doctor · Clinical workspace">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        {/* Queue */}
        <aside className="glass-strong rounded-2xl p-4 lg:max-h-[calc(100vh-10rem)] lg:overflow-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Patient queue</h2>
            <span className="text-xs text-primary">{queue.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {queue.map(qp => (
              <button key={qp.id} onClick={() => { setSelected(qp.id); setTab("Review"); }}
                className={`w-full text-left glass rounded-xl p-3 transition ${selected === qp.id ? "ring-1 ring-primary/50" : "hover:bg-white/10"}`}>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[11px] text-primary">{qp.id}</div>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_TONE[qp.status]}`}>{qp.status.replace(/_/g, " ")}</span>
                </div>
                <div className="mt-1 text-sm font-medium truncate">{qp.name} <span className="text-muted-foreground text-xs">· {qp.age}/{qp.gender}</span></div>
                <div className="text-[11px] text-muted-foreground truncate">{qp.complaint}</div>
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
                {tab === "Queue" || tab === "Review" ? <Review /> : null}
                {tab === "Tests" && <Tests onSend={() => setStatus(p.id, "lab_pending")} />}
                {tab === "Prescription" && <Prescription onSend={() => setStatus(p.id, "pharmacy_pending")} />}
                {tab === "History" && <History />}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button onClick={() => setStatus(p.id, "lab_pending")} className="rounded-xl px-4 py-2 text-sm border border-white/10 hover:bg-white/5">Send to lab</button>
                <button onClick={() => setStatus(p.id, "pharmacy_pending")} className="rounded-xl px-4 py-2 text-sm border border-white/10 hover:bg-white/5">Send to pharmacy</button>
                <button onClick={() => setStatus(p.id, "closed")} className="btn-primary rounded-xl px-4 py-2 text-sm">Close file</button>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
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

function Tests({ onSend }: { onSend: () => void }) {
  const [list, setList] = useState<string[]>([]);
  const [t, setT] = useState("");
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
      {list.length > 0 && (
        <button onClick={() => { onSend(); setList([]); }} className="btn-primary mt-5 rounded-xl px-5 py-2.5 text-sm">Send {list.length} test(s) to lab →</button>
      )}
    </div>
  );
}

function Prescription({ onSend }: { onSend: () => void }) {
  const [rows, setRows] = useState<Array<{ med: string; salt: string; dose: string; freq: string; days: string; route: string; instr: string }>>(
    [{ med: "", salt: "", dose: "", freq: "", days: "", route: "", instr: "" }]
  );
  const update = (i: number, k: string, v: string) => setRows(r => r.map((x, j) => j === i ? { ...x, [k]: v } : x));
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
        <button onClick={onSend} className="btn-primary rounded-xl px-5 py-2 text-sm">Send to pharmacy →</button>
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
