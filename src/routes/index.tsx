import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { BrandMark } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediFlow Clinical — Hospital Workflow Platform" },
      { name: "description", content: "Secure, role-based, AI-assisted hospital workflow management. Connect compounders, doctors, labs, and pharmacy in one platform." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.navigate({ to: "/access" }), 2200);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="relative min-h-screen overflow-hidden grid place-items-center px-6">
      {/* glow orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-[520px] rounded-full bg-primary/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-[520px] rounded-full bg-accent/20 blur-3xl animate-float-slow" />

      {/* EKG line */}
      <svg viewBox="0 0 1200 200" className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full opacity-30">
        <path
          className="animate-ekg"
          d="M0 100 L200 100 L240 60 L280 140 L320 40 L360 160 L400 100 L1200 100"
          stroke="url(#g)" strokeWidth="2" fill="none"
        />
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.16 210)" />
            <stop offset="100%" stopColor="oklch(0.72 0.18 195)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative text-center animate-fade-up">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-accent blur-2xl opacity-70 animate-pulse-glow" />
            <div className="relative size-24 rounded-3xl glass-strong grid place-items-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="animate-heartbeat text-primary">
                <path d="M12 21s-7-4.35-7-10a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2c0 5.65-7 10-7 10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
        <div className="text-xs uppercase tracking-[0.32em] text-muted-foreground mb-3">Hospital Workflow Platform</div>
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl gradient-text text-glow">
          WELCOME TO MEDIFLOW
        </h1>
        <div className="mt-6 flex justify-center">
          <div className="h-1 w-32 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full animate-pulse-glow" />
        </div>
        <div className="mt-10 hidden md:block">
          <BrandMark />
        </div>
      </div>
    </div>
  );
}
