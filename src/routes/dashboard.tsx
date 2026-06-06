import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  currentUser,
  getLabOrders,
  getPatientQueue,
  getPrescriptionOrders,
} from "@/lib/mediflow-store";
import { useHospitalStaff } from "@/hooks/use-mediflow";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MediFlow Clinical" }] }),
  component: Dashboard,
});

function Dashboard() {
  const u = currentUser();
  const { staff } = useHospitalStaff(u?.hospitalId ?? null);
  const patients = u ? getPatientQueue(u.hospitalCode) : [];
  const labOrders = u ? getLabOrders(u.hospitalCode) : [];
  const prescriptions = u ? getPrescriptionOrders(u.hospitalCode) : [];
  const pending = staff.filter((s) => s.status === "pending").length;
  const active = staff.filter((s) => s.active).length;
  const closed = patients.filter((p) => p.status === "closed").length;
  const waiting = patients.filter((p) => p.status === "waiting_for_doctor").length;
  const labPending = labOrders.filter((o) => o.status !== "report_uploaded").length;
  const reports = labOrders.filter((o) => o.status === "report_uploaded").length;
  const pharmacyPending = prescriptions.filter((o) => o.status === "pending").length;


  const stats = [
    {
      label: "Patients today",
      value: String(patients.length),
      trend: patients.length ? "live" : "—",
      tone: "primary",
    },
    {
      label: "Waiting for doctor",
      value: String(waiting),
      trend: waiting ? "live" : "—",
      tone: "warning",
    },
    {
      label: "Lab orders pending",
      value: String(labPending),
      trend: labPending ? "review" : "—",
      tone: "accent",
    },
    {
      label: "Reports uploaded",
      value: String(reports),
      trend: reports ? "today" : "—",
      tone: "primary",
    },
    {
      label: "Pharmacy pending",
      value: String(pharmacyPending),
      trend: pharmacyPending ? "live" : "—",
      tone: "accent",
    },
    {
      label: "Pending staff requests",
      value: String(pending),
      trend: pending ? "review" : "—",
      tone: "warning",
    },
    { label: "Active staff online", value: String(active), trend: "now", tone: "success" },
    {
      label: "Files closed today",
      value: String(closed),
      trend: closed ? "done" : "—",
      tone: "primary",
    },
  ] as const;

  const workflow = [
    ["Intake", patients.length],
    ["Doctor", waiting],
    ["Lab", labPending],
    ["Pharmacy", pharmacyPending],
    ["Closed", closed],
  ] as const;
  const activity = [
    ...patients.slice(0, 2).map((p) => ({
      who: p.createdByName ?? "Intake",
      what: `added intake ${p.id}`,
      when: new Date(p.createdAt).toLocaleTimeString(),
    })),
    ...labOrders.slice(0, 2).map((o) => ({
      who: o.uploadedByName ?? o.orderedByName ?? "Lab",
      what: `${o.status.replace(/_/g, " ")} · ${o.test}`,
      when: new Date(o.completedAt ?? o.orderedAt).toLocaleTimeString(),
    })),
    ...prescriptions.slice(0, 2).map((o) => ({
      who: o.dispensedByName ?? o.orderedByName ?? "Pharmacy",
      what: `${o.status} prescription ${o.id}`,
      when: new Date(o.dispensedAt ?? o.orderedAt).toLocaleTimeString(),
    })),
  ].slice(0, 5);

  return (
    <AppShell title="Hospital overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4 lg:p-5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-3xl lg:text-4xl font-display gradient-text">{s.value}</div>
              <Tone tone={s.tone}>{s.trend}</Tone>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-strong rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Live workflow</h2>
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success animate-pulse-glow" /> updating
            </span>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {workflow.map(([label, n]) => (
              <div key={label as string} className="glass rounded-xl p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="text-2xl font-display mt-1">{n}</div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Patient flow (last 24h)
            </div>
            <div className="h-32 relative glass rounded-xl overflow-hidden">
              <svg viewBox="0 0 400 120" className="absolute inset-0 w-full h-full">
                <defs>
                  <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 210)" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 210)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 90 C 40 70, 80 80, 120 60 S 200 30, 240 50 S 320 80, 400 40 L400 120 L0 120 Z"
                  fill="url(#area)"
                />
                <path
                  d="M0 90 C 40 70, 80 80, 120 60 S 200 30, 240 50 S 320 80, 400 40"
                  stroke="oklch(0.78 0.16 210)"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5">
          <h2 className="text-lg">Recent activity</h2>
          <ul className="mt-4 space-y-3">
            {activity.length === 0 && (
              <li className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
                No operational activity yet.
              </li>
            )}
            {activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-gradient-to-br from-primary/70 to-accent/70 grid place-items-center text-[11px] font-semibold">
                  {a.who[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="text-foreground">{a.who}</span>{" "}
                    <span className="text-muted-foreground">{a.what}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{a.when}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function Tone({ tone, children }: { tone: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  };
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${map[tone]}`}>
      {children}
    </span>
  );
}
