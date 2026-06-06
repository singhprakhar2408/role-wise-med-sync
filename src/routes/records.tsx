import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  currentUser,
  getLabOrders,
  getPatientQueue,
  getPrescriptionOrders,
  type PatientQueueRecord,
} from "@/lib/mediflow-store";

export const Route = createFileRoute("/records")({
  head: () => ({ meta: [{ title: "Patient Records — MediFlow Clinical" }] }),
  component: Records,
});

function Records() {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const user = currentUser();
  const canSeeNotes = user?.role === "doctor" || user?.role === "hospital_admin" || user?.role === "super_admin";
  const hospitalCode = user?.hospitalCode ?? "";
  const records = hospitalCode ? getPatientQueue(hospitalCode) : [];
  const labOrders = hospitalCode ? getLabOrders(hospitalCode) : [];
  const prescriptions = hospitalCode ? getPrescriptionOrders(hospitalCode) : [];

  const list = records.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.id.toLowerCase().includes(q.toLowerCase()),
  );
  const sel = records.find((p) => p.id === selectedId) ?? list[0] ?? null;
  const selectedLabs = sel ? labOrders.filter((o) => o.patientId === sel.id) : [];
  const selectedRx = sel ? prescriptions.filter((o) => o.patientId === sel.id) : [];

  return (
    <AppShell title="Patient records">
      <div className="grid lg:grid-cols-[360px_1fr] gap-4">
        <aside className="glass-strong rounded-2xl p-4 lg:max-h-[calc(100vh-10rem)] lg:overflow-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm ring-focus"
          />
          <div className="mt-3 space-y-2">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left glass rounded-xl p-3 transition ${sel?.id === p.id ? "ring-1 ring-primary/50" : "hover:bg-white/10"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-primary">{p.id}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium truncate">{p.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {p.age}/{p.gender} · {p.complaint || "No complaint recorded"}
                </div>
              </button>
            ))}
            {list.length === 0 && (
              <div className="text-sm text-muted-foreground glass rounded-xl p-4">
                No patient records yet.
              </div>
            )}
          </div>
        </aside>

        <section className="glass-strong rounded-2xl p-5">
          {!sel ? (
            <div className="text-muted-foreground">Select a record.</div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-mono text-xs text-primary">{sel.id}</div>
                  <h2 className="text-xl mt-0.5">
                    {sel.name}{" "}
                    <span className="text-muted-foreground text-sm">
                      · {sel.age}/{sel.gender}
                    </span>
                  </h2>
                  <div className="text-sm text-muted-foreground">
                    {sel.complaint || "No complaint recorded"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                    {sel.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                    {selectedLabs.length} reports
                  </span>
                </div>
              </div>

              <div className="mt-5 grid md:grid-cols-2 gap-4">
                <Card title="Intake snapshot">
                  <Row k="BP" v={sel.bp || "—"} />
                  <Row k="Pulse" v={sel.pulse || "—"} />
                  <Row k="Temp" v={sel.temp || "—"} />
                  <Row k="SpO2" v={sel.spo2 || "—"} />
                </Card>
                <Card title="Lab reports">
                  {selectedLabs.length === 0 && <Row k="Status" v="No reports yet" />}
                  {selectedLabs.slice(0, 4).map((o) => (
                    <Row key={o.id} k={o.test} v={o.summary || o.status.replace(/_/g, " ")} />
                  ))}
                </Card>
                <Card title="Prescriptions">
                  {selectedRx.length === 0 && <Row k="Status" v="No prescriptions yet" />}
                  {selectedRx.slice(0, 4).map((o) => (
                    <Row
                      key={o.id}
                      k={o.id}
                      v={`${o.items.length} item${o.items.length === 1 ? "" : "s"} · ${o.status}`}
                    />
                  ))}
                </Card>
                <Card title="Allergies & alerts">
                  <Row k="Allergy" v={sel.allergies || "—"} />
                  <Row k="History" v={sel.previousDiseases || sel.history || "—"} />
                </Card>
              </div>

              {canSeeNotes ? (
                <Card title="Doctor's clinical notes" className="mt-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {sel.symptoms || sel.previousDiseases || sel.history
                      ? [sel.symptoms, sel.previousDiseases || sel.history]
                          .filter(Boolean)
                          .join(" · ")
                      : "No private clinical notes have been added yet."}
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

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass rounded-2xl p-4 ${className ?? ""}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
