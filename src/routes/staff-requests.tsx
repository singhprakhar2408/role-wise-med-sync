import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { currentUser, setUserStatus, ROLE_LABEL } from "@/lib/mediflow-store";
import { useHospitalStaff } from "@/hooks/use-mediflow";

export const Route = createFileRoute("/staff-requests")({
  head: () => ({ meta: [{ title: "Staff Requests — MediFlow Clinical" }] }),
  component: StaffRequests,
});

function StaffRequests() {
  const u = currentUser();
  const { staff: all, reload } = useHospitalStaff(u?.hospitalId ?? null);
  const pending = all.filter((s) => s.status === "pending");
  const others = all.filter((s) => s.status !== "pending");

  const act = async (id: string, status: "approved" | "rejected" | "suspended") => {
    try {
      await setUserStatus(id, status);
      toast.success(`Marked ${status}`);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppShell title="Staff requests & roster">
      <section>
        <h2 className="text-lg mb-3">
          Pending approvals <span className="text-muted-foreground text-sm">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
            No pending requests.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {pending.map((s) => (
              <div key={s.id} className="glass-strong rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center font-semibold text-primary-foreground">
                    {s.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.fullName}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {ROLE_LABEL[s.role]} · {s.department}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                    pending
                  </span>
                </div>
                <dl className="mt-4 text-xs grid grid-cols-2 gap-y-2 gap-x-3">
                  <KV k="Email" v={s.email} />
                  <KV k="Mobile" v={s.mobile} />
                  <KV k="License" v={s.licenseNo || "—"} />
                  <KV k="Applied" v={new Date(s.createdAt).toLocaleDateString()} />
                </dl>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => act(s.id, "approved")} className="btn-primary flex-1 rounded-xl py-2 text-sm">
                    Approve
                  </button>
                  <button onClick={() => act(s.id, "rejected")} className="flex-1 rounded-xl py-2 text-sm border border-destructive/40 text-destructive hover:bg-destructive/10">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg mb-3">Hospital roster</h2>
        <div className="glass-strong rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-white/[0.03]">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Department</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Email</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {others.map((s) => (
                <tr key={s.id} className="border-t border-white/5">
                  <td className="px-4 py-3">{s.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ROLE_LABEL[s.role]}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.department}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      s.status === "approved" ? "bg-success/15 text-success" :
                      s.status === "suspended" ? "bg-warning/15 text-warning" :
                      "bg-destructive/15 text-destructive"
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === "approved" ? (
                      <button onClick={() => act(s.id, "suspended")} className="text-[11px] text-warning hover:underline">Suspend</button>
                    ) : s.status === "suspended" ? (
                      <button onClick={() => act(s.id, "approved")} className="text-[11px] text-success hover:underline">Reinstate</button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {others.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground text-sm">No staff yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate">{v}</dd>
    </>
  );
}
