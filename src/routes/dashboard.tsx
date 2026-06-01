import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { currentUser, staffForHospital } from "@/lib/mediflow-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MediFlow Clinical" }] }),
  component: Dashboard,
});

function Dashboard() {
  const u = currentUser();
  const staff = u ? staffForHospital(u.hospitalCode) : [];
  const pending = staff.filter(s => s.status === "pending").length;
  const active = staff.filter(s => s.active).length;

  const stats = [
    { label: "Patients today", value: "48", trend: "+12%", tone: "primary" },
    { label: "Waiting for doctor", value: "9", trend: "live", tone: "warning" },
    { label: "Lab orders pending", value: "14", trend: "+3", tone: "accent" },
    { label: "Reports uploaded", value: "27", trend: "today", tone: "primary" },
    { label: "Pharmacy pending", value: "11", trend: "live", tone: "accent" },
    { label: "Pending staff requests", value: String(pending), trend: pending ? "review" : "—", tone: "warning" },
    { label: "Active staff online", value: String(active), trend: "now", tone: "success" },
    { label: "Files closed today", value: "32", trend: "+8", tone: "primary" },
  ] as const;

  const activity = [
    { who: "Dr. Mehta", what: "closed file #P-1284", when: "2m" },
    { who: "Lab", what: "uploaded CBC report for #P-1290", when: "5m" },
    { who: "Pharmacy", what: "dispensed prescription #RX-882", when: "9m" },
    { who: "Compounder Riya", what: "added intake #P-1294", when: "14m" },
    { who: "Dr. Khan", what: "ordered Chest X-ray for #P-1287", when: "21m" },
  ];

  return (
    <AppShell title="Hospital overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {stats.map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 lg:p-5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
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
            {[
              ["Intake", 6],
              ["Doctor", 9],
              ["Lab", 14],
              ["Pharmacy", 11],
              ["Closed", 32],
            ].map(([label, n]) => (
              <div key={label as string} className="glass rounded-xl p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="text-2xl font-display mt-1">{n}</div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Patient flow (last 24h)</div>
            <div className="h-32 relative glass rounded-xl overflow-hidden">
              <svg viewBox="0 0 400 120" className="absolute inset-0 w-full h-full">
                <defs>
                  <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 210)" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 210)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 90 C 40 70, 80 80, 120 60 S 200 30, 240 50 S 320 80, 400 40 L400 120 L0 120 Z" fill="url(#area)" />
                <path d="M0 90 C 40 70, 80 80, 120 60 S 200 30, 240 50 S 320 80, 400 40" stroke="oklch(0.78 0.16 210)" strokeWidth="2" fill="none" />
              </svg>
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5">
          <h2 className="text-lg">Recent activity</h2>
          <ul className="mt-4 space-y-3">
            {activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-gradient-to-br from-primary/70 to-accent/70 grid place-items-center text-[11px] font-semibold">
                  {a.who[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm"><span className="text-foreground">{a.who}</span> <span className="text-muted-foreground">{a.what}</span></div>
                  <div className="text-[11px] text-muted-foreground">{a.when} ago</div>
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
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${map[tone]}`}>{children}</span>;
}
