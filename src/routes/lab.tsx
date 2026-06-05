import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/lab")({
  head: () => ({ meta: [{ title: "Laboratory — MediFlow Clinical" }] }),
  component: Lab,
});

type LStatus = "pending" | "sample_collected" | "processing" | "report_uploaded";
interface Order { id: string; patientId: string; patient: string; test: string; priority: "Routine" | "Urgent" | "STAT"; status: LStatus; summary?: string; completedAt?: number; }

const seedOrders: Order[] = [
  { id: "L-441", patientId: "P-1287", patient: "Rahul Verma", test: "Lipid profile", priority: "Routine", status: "pending" },
  { id: "L-442", patientId: "P-1290", patient: "Aarav Sharma", test: "Troponin I", priority: "STAT", status: "sample_collected" },
  { id: "L-443", patientId: "P-1291", patient: "Sara Khan", test: "CBC", priority: "Urgent", status: "processing" },
  { id: "L-440", patientId: "P-1284", patient: "Priya Iyer", test: "Urine routine", priority: "Routine", status: "report_uploaded", summary: "Within normal limits", completedAt: Date.now() - 3600_000 },
];

const TONE: Record<LStatus, string> = {
  pending: "bg-warning/15 text-warning",
  sample_collected: "bg-accent/15 text-accent",
  processing: "bg-primary/15 text-primary",
  report_uploaded: "bg-success/15 text-success",
};
const PRIO: Record<Order["priority"], string> = {
  Routine: "bg-white/10 text-muted-foreground",
  Urgent: "bg-warning/15 text-warning",
  STAT: "bg-destructive/15 text-destructive",
};

function Lab() {
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [open, setOpen] = useState<string | null>(null);
  const [summary, setSummary] = useState("");

  const upd = (id: string, patch: Partial<Order>) => setOrders(o => o.map(x => x.id === id ? { ...x, ...patch } : x));

  const active = useMemo(() => orders.filter(o => o.status !== "report_uploaded"), [orders]);
  const done = useMemo(() => orders.filter(o => o.status === "report_uploaded"), [orders]);

  const sendReport = (id: string) => {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    if (!summary.trim()) { toast.error("Add a short report summary first"); return; }
    upd(id, { status: "report_uploaded", summary, completedAt: Date.now() });
    toast.success("Report sent to Doctor", { description: `${o.patient} · ${o.test}` });
    setOpen(null); setSummary("");
  };

  return (
    <AppShell title="Laboratory · Test orders">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="glass rounded-full px-3 py-1.5">Total orders: <span className="text-primary font-semibold">{orders.length}</span></span>
        <span className="glass rounded-full px-3 py-1.5">Pending: <span className="text-warning font-semibold">{orders.filter(o => o.status === "pending").length}</span></span>
        <span className="glass rounded-full px-3 py-1.5">In progress: <span className="text-accent font-semibold">{orders.filter(o => o.status === "sample_collected" || o.status === "processing").length}</span></span>
        <span className="glass rounded-full px-3 py-1.5">Completed: <span className="text-success font-semibold">{done.length}</span></span>
      </div>

      <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Active queue</h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {active.length === 0 && <div className="text-sm text-muted-foreground glass rounded-xl p-4">All caught up.</div>}
        {active.map(o => (
          <div key={o.id} className="glass-strong rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] text-primary">{o.id} · {o.patientId}</div>
                <div className="mt-0.5 text-sm font-medium">{o.patient}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${TONE[o.status]}`}>{o.status.replace(/_/g, " ")}</span>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${PRIO[o.priority]}`}>{o.priority}</span>
              </div>
            </div>
            <div className="mt-3 text-sm">{o.test}</div>

            <div className="mt-4 flex flex-wrap gap-2">
              {o.status === "pending" && <button onClick={() => upd(o.id, { status: "sample_collected" })} className="rounded-lg px-3 py-1.5 text-xs border border-white/10 hover:bg-white/5">Sample collected</button>}
              {o.status === "sample_collected" && <button onClick={() => upd(o.id, { status: "processing" })} className="rounded-lg px-3 py-1.5 text-xs border border-white/10 hover:bg-white/5">Start processing</button>}
              <button onClick={() => { setOpen(o.id); setSummary(""); }} className="btn-primary rounded-lg px-3 py-1.5 text-xs">Upload report</button>
            </div>

            {open === o.id && (
              <div className="mt-3 glass rounded-xl p-3">
                <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Report summary…"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm ring-focus" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="text-xs text-muted-foreground glass rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/10">
                    Attach file <input type="file" className="hidden" />
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => { setOpen(null); setSummary(""); }} className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/5">Cancel</button>
                    <button onClick={() => sendReport(o.id)} className="btn-primary text-xs px-3 py-1.5 rounded-lg">Send Report to Doctor →</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm uppercase tracking-wider text-muted-foreground mb-2">Tests you have completed</h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {done.length === 0 && <div className="text-sm text-muted-foreground glass rounded-xl p-4">No completed reports yet.</div>}
        {done.map(o => (
          <div key={o.id} className="glass rounded-2xl p-4 ring-1 ring-success/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] text-primary">{o.id} · {o.patientId}</div>
                <div className="mt-0.5 text-sm font-medium">{o.patient}</div>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-success">delivered</span>
            </div>
            <div className="mt-2 text-sm">{o.test}</div>
            {o.summary && <div className="mt-2 text-xs text-muted-foreground glass rounded-lg p-2">{o.summary}</div>}
            {o.completedAt && <div className="mt-2 text-[10px] text-muted-foreground">{new Date(o.completedAt).toLocaleString()}</div>}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
