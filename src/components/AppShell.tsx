import { Link, useRouter } from "@tanstack/react-router";
import { currentUser, logout, ROLE_LABEL } from "@/lib/mediflow-store";
import { useState } from "react";

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const user = currentUser();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) {
    router.navigate({ to: "/access" });
    return null;
  }

  const admin = ["hospital_admin", "super_admin"];
  const nav: Array<{ to: string; label: string; roles: Array<string> }> = [
    { to: "/dashboard", label: "Dashboard", roles: admin },
    { to: "/staff-requests", label: "Staff Requests", roles: admin },
    { to: "/compounder", label: "Intake", roles: ["compounder", ...admin] },
    { to: "/doctor", label: "Doctor Queue", roles: ["doctor", ...admin] },
    { to: "/lab", label: "Laboratory", roles: ["lab", ...admin] },
    { to: "/pharmacy", label: "Pharmacy", roles: ["pharmacist", ...admin] },
    {
      to: "/records",
      label: "Patient Records",
      roles: ["records_viewer", "doctor", "compounder", ...admin],
    },
  ];
  const items = nav.filter((n) => n.roles.includes(user.role));


  return (
    <div className="min-h-screen flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-2 p-5 glass-strong m-4 rounded-2xl sticky top-4 h-[calc(100vh-2rem)]">
        <BrandMark />
        <div className="mt-6 flex flex-col gap-1">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
              activeProps={{
                className:
                  "px-4 py-2.5 rounded-xl text-sm text-primary-foreground bg-white/10 border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]",
              }}
            >
              {i.label}
            </Link>
          ))}
        </div>
        <div className="mt-auto glass rounded-xl p-3 flex items-center gap-3">
          <div className="size-9 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-sm font-semibold text-primary-foreground">
            {user.fullName
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm truncate">{user.fullName}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {ROLE_LABEL[user.role]} · {user.hospitalCode}
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.navigate({ to: "/access" });
            }}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Exit
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Top bar — mobile */}
        <header className="lg:hidden sticky top-0 z-30 glass-strong rounded-b-2xl px-4 py-3 flex items-center justify-between">
          <button
            aria-label="Menu"
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <BrandMark compact />
          <Link to="/access" onClick={() => logout()} className="text-xs text-muted-foreground">
            Exit
          </Link>
        </header>

        {menuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-72 glass-strong p-5 flex flex-col gap-1 animate-fade-up"
              onClick={(e) => e.stopPropagation()}
            >
              <BrandMark />
              <div className="mt-4 flex flex-col gap-1">
                {items.map((i) => (
                  <Link
                    key={i.to}
                    to={i.to}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5"
                  >
                    {i.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="p-4 lg:p-8">
          <div className="mb-6 lg:mb-8 animate-fade-up">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {user.hospitalCode}
            </div>
            <h1 className="text-2xl lg:text-3xl mt-1">{title}</h1>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent blur-md opacity-60 animate-pulse-glow" />
        <div className="relative size-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-heartbeat">
            <path
              d="M12 21s-7-4.35-7-10a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2c0 5.65-7 10-7 10z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-semibold">MediFlow</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Clinical
          </div>
        </div>
      )}
    </div>
  );
}
