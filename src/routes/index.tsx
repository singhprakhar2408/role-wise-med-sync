import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/AppShell";
import { SITE } from "@/lib/site-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediFlow Clinical — Hospital Workflow Platform" },
      { name: "description", content: SITE.description },
    ],
    links: [{ rel: "canonical", href: SITE.url }],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <div className="relative min-h-screen overflow-hidden px-6">
      {/* glow orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-[520px] rounded-full bg-primary/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-[520px] rounded-full bg-accent/20 blur-3xl animate-float-slow" />

      {/* EKG line */}
      <svg
        viewBox="0 0 1200 200"
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full opacity-30"
      >
        <path
          className="animate-ekg"
          d="M0 100 L200 100 L240 60 L280 140 L320 40 L360 160 L400 100 L1200 100"
          stroke="url(#g)"
          strokeWidth="2"
          fill="none"
        />
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.16 210)" />
            <stop offset="100%" stopColor="oklch(0.72 0.18 195)" />
          </linearGradient>
        </defs>
      </svg>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between py-6">
        <BrandMark />
        <Link
          to="/access"
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
        >
          Staff access
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl place-items-center py-12">
        <div className="max-w-4xl text-center animate-fade-up">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-accent blur-2xl opacity-70 animate-pulse-glow" />
              <div className="relative size-24 rounded-3xl glass-strong grid place-items-center">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="animate-heartbeat text-primary"
                >
                  <path
                    d="M12 21s-7-4.35-7-10a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2c0 5.65-7 10-7 10z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="text-xs uppercase tracking-[0.32em] text-muted-foreground mb-3">
            Hospital Workflow Platform
          </div>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl gradient-text text-glow">
            MediFlow Clinical
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Secure role-based hospital workflow software for patient intake, doctor consultation,
            laboratory reports, pharmacy dispensing, records, and staff approvals.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/access" className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold">
              Open hospital access
            </Link>
            <a
              href="#workflow"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            >
              View workflow
            </a>
          </div>
          <div className="mt-6 flex justify-center">
            <div className="h-1 w-32 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full animate-pulse-glow" />
          </div>
          <div id="workflow" className="mt-10 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Intake", "Capture symptoms, vitals, previous diseases, and assignment."],
              ["Doctor", "Review queue, clinical assist, tests, reports, and prescriptions."],
              ["Laboratory", "Receive test orders and return submitted reports."],
              ["Pharmacy", "Receive prescriptions and mark dispensing complete."],
            ].map(([title, text]) => (
              <div key={title} className="glass rounded-2xl p-4">
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
