import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { currentUser } from "@/lib/mediflow-store";

export const Route = createFileRoute("/records")({
  head: () => ({ meta: [{ title: "Patient Records — MediFlow Clinical" }] }),
  component: Records,
});

interface PR { id: string; name: string; age: number; gender: string; lastVisit: string; diagnosis: string; }
const seed: PR[] = [
  { id: "P-1284", name: "Priya Iyer", age: 28, gender: "F", lastVisit: "Today", diagnosis: "Gastritis" },
  { id: "P-1287", name: "Rahul Verma", age: 41, gender: "M", lastVisit: "Today", diagnosis: "Hypertension" },
  { id: "P-1290", name: "Aarav Sharma", age: 54, gender: "M", lastVisit: "Today", diagnosis: "ACS rule-out" },
  { id: "P-1291", name: "Sara Khan", age: 32, gender: "F", lastVisit: "Today", diagnosis: "URTI" },
  { id: "P-1240", name: "Anita Rao", age: 60, gender: "F", lastVisit: "2 days ago", diagnosis: "T2DM" },
];

function Records() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<PR | null>(seed[0]);
  const user = currentUser();
  const canSeeNotes = user?.role === "doctor" || user?.role === "host_admin";

  const list = seed.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.id.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell title="Patient records">
      <div className="grid lg:grid-cols-[360px_1fr] gap-4">
        <aside className="glass-strong rounded-2xl p-4 lg:max-h-[calc(100vh-10rem)] lg:overflow-auto">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or ID…"
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm ring-focus" />
          <div className="mt-3 space-y-2">
            {list.map(p => (
              <button key={p.id} onClick={() => setSel(p)}
                className={`w-full text-left glass rounded-xl p-3 transition ${sel?.id === p.id ? "ring-1 ring-primary/50" : "hover:bg-white/10"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-primary">{p.id}</span>
                  <span className="text-[10px] text-muted-foreground">{p.lastVisit}</span>
                </div>
                <div className="mt-1 text-sm font-medium truncate">{p.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{p.age}/{p.gender} · {p.diagnosis}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="glass-strong rounded-2xl p-5">
          {!sel ? <div className="text-muted-foreground">Select a record.</div> : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-mono text-xs text-primary">{sel.id}</div>
                  <h2 className="text-xl mt-0.5">{sel.name} <span className="text-muted-foreground text-sm">· {sel.age}/{sel.gender}</span></h2>
                  <div className="text-sm text-muted-foreground">Working diagnosis: {sel.diagnosis}</div>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">3 visits</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent">5 reports</span>
                </div>
              </div>

              <div className="mt-5 grid md:grid-cols-2 gap-4">
                <Card title="Recent visits">
                  <Row k="Today" v="Dr. Mehta · OPD" />
                  <Row k="2 weeks ago" v="Dr. Khan · Cardio f/u" />
                  <Row k="Mar 03" v="Dr. Mehta · OPD" />
                </Card>
                <Card title="Lab reports">
                  <Row k="CBC" v="WNL · today" />
                  <Row k="Lipid" v="High LDL · 3d ago" />
                  <Row k="ECG" v="Sinus rhythm · 2w ago" />
                </Card>
                <Card title="Prescriptions">
                  <Row k="RX-882" v="Pantoprazole · Ondansetron" />
                  <Row k="RX-870" v="Amlodipine 5mg OD" />
                </Card>
                <Card title="Allergies & alerts">
                  <Row k="Allergy" v="Penicillin" />
                  <Row k="Chronic" v="Hypertension since 2019" />
                </Card>
              </div>

              {canSeeNotes ? (
                <Card title="Doctor's clinical notes" className="mt-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Patient reports occasional epigastric burning post meals. Denies hematemesis. Plan: PPI 5 days, dietary advice. Review if no improvement in 1 week.
                  </p>
                </Card>
              ) : (
                <div className="mt-4 glass rounded-xl p-4 text-xs text-muted-foreground">
                  Private doctor notes are not visible to your role.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-2xl p-4 ${className ?? ""}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></div>;
}
