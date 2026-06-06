import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  createHospital,
  currentUser,
  fetchAllStaff,
  listHospitals,
  REGISTRABLE_ROLES,
  ROLE_LABEL,
  setHospitalStatus,
  setUserRole,
  setUserStatus,
  type Hospital,
  type Role,
  type StaffAccount,
} from "@/lib/mediflow-store";
import { useHospitalStaff } from "@/hooks/use-mediflow";

export const Route = createFileRoute("/staff-requests")({
  head: () => ({ meta: [{ title: "Admin Operations — MediFlow Clinical" }] }),
  component: StaffRequests,
});

const MANAGED_ROLES: Role[] = ["hospital_admin", ...REGISTRABLE_ROLES];

function StaffRequests() {
  const u = currentUser();
  const isSuperAdmin = u?.role === "super_admin";
  const hospitalStaff = useHospitalStaff(isSuperAdmin ? null : (u?.hospitalId ?? null));
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [platformStaff, setPlatformStaff] = useState<StaffAccount[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });

  const loadPlatform = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const [hospitalRows, staffRows] = await Promise.all([listHospitals(), fetchAllStaff()]);
      setHospitals(hospitalRows);
      setPlatformStaff(staffRows);
      setSelectedHospitalId((current) => current || hospitalRows[0]?.id || "");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    void loadPlatform();
  }, [loadPlatform]);

  const all = useMemo(() => {
    if (!isSuperAdmin) return hospitalStaff.staff;
    return selectedHospitalId
      ? platformStaff.filter((staff) => staff.hospitalId === selectedHospitalId)
      : platformStaff.filter((staff) => staff.role !== "super_admin");
  }, [hospitalStaff.staff, isSuperAdmin, platformStaff, selectedHospitalId]);

  const pending = all.filter((s) => s.status === "pending");
  const others = all.filter((s) => s.status !== "pending");

  const reload = () => {
    if (isSuperAdmin) void loadPlatform();
    else hospitalStaff.reload();
  };

  const act = async (id: string, status: "approved" | "rejected" | "suspended") => {
    try {
      await setUserStatus(id, status);
      toast.success(`Marked ${status}`);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const changeRole = async (id: string, role: Role) => {
    try {
      await setUserRole(id, role);
      toast.success(`Role changed to ${ROLE_LABEL[role]}`);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const addHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const hospital = await createHospital(form.code, form.name);
      toast.success(`Hospital ${hospital.code} created`);
      setForm({ code: "", name: "" });
      setSelectedHospitalId(hospital.id);
      await loadPlatform();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const toggleHospital = async (hospital: Hospital) => {
    try {
      const next = hospital.status === "active" ? "inactive" : "active";
      await setHospitalStatus(hospital.id, next);
      toast.success(`${hospital.code} marked ${next}`);
      await loadPlatform();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <AppShell title={isSuperAdmin ? "Platform admin operations" : "Staff requests & roster"}>
      {isSuperAdmin && (
        <section className="mb-8 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-strong rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Hospital registry
            </div>
            <h2 className="mt-1 text-xl">Create and verify hospitals</h2>
            <form onSubmit={addHospital} className="mt-4 grid gap-3 sm:grid-cols-[0.7fr_1fr_auto]">
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="HOSPITAL-CODE"
                className="input font-mono tracking-widest"
              />
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Hospital legal name"
                className="input"
              />
              <button
                disabled={creating}
                className="btn-primary rounded-xl px-4 text-sm font-medium disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </form>
            <div className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Create only after physical/legal verification. Hospital admins can approve staff only
              inside their hospital.
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Active tenants
                </div>
                <h2 className="mt-1 text-xl">{hospitals.length} hospitals</h2>
              </div>
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="input max-w-xs"
              >
                <option value="">All hospitals</option>
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.code} · {hospital.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {hospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-primary">{hospital.code}</div>
                      <div className="truncate text-sm">{hospital.name}</div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                        hospital.status === "active"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      }`}
                    >
                      {hospital.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleHospital(hospital)}
                    className="mt-3 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {hospital.status === "active" ? "Deactivate hospital" : "Reactivate hospital"}
                  </button>
                </div>
              ))}
              {hospitals.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
                  No hospitals have been created yet.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg">
          Pending approvals{" "}
          <span className="text-sm text-muted-foreground">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
            No pending requests.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((s) => (
              <StaffCard
                key={s.id}
                staff={s}
                onStatus={act}
                onRole={changeRole}
                canChangeRole={isSuperAdmin}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg">Hospital roster</h2>
        <div className="glass-strong overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">Department</th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">Email</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {others.map((s) => (
                <tr key={s.id} className="border-t border-white/5">
                  <td className="px-4 py-3">{s.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {isSuperAdmin ? (
                      <select
                        value={s.role}
                        onChange={(e) => changeRole(s.id, e.target.value as Role)}
                        className="rounded-lg border border-white/10 bg-background px-2 py-1 text-xs"
                      >
                        {MANAGED_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      ROLE_LABEL[s.role]
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {s.department}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {s.email}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === "approved" ? (
                      <button
                        onClick={() => act(s.id, "suspended")}
                        className="text-[11px] text-warning hover:underline"
                      >
                        Suspend
                      </button>
                    ) : s.status === "suspended" ? (
                      <button
                        onClick={() => act(s.id, "approved")}
                        className="text-[11px] text-success hover:underline"
                      >
                        Reinstate
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {others.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No staff yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function StaffCard({
  staff,
  onStatus,
  onRole,
  canChangeRole,
}: {
  staff: StaffAccount;
  onStatus: (id: string, status: "approved" | "rejected" | "suspended") => void;
  onRole: (id: string, role: Role) => void;
  canChangeRole: boolean;
}) {
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent font-semibold text-primary-foreground">
          {staff.fullName
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{staff.fullName}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {ROLE_LABEL[staff.role]} · {staff.department}
          </div>
        </div>
        <StatusPill status={staff.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <KV k="Email" v={staff.email} />
        <KV k="Mobile" v={staff.mobile} />
        <KV k="License" v={staff.licenseNo || "—"} />
        <KV k="Applied" v={new Date(staff.createdAt).toLocaleDateString()} />
      </dl>
      {canChangeRole && (
        <label className="mt-4 block">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Approve as
          </span>
          <select
            value={staff.role}
            onChange={(e) => onRole(staff.id, e.target.value as Role)}
            className="input mt-1.5"
          >
            {MANAGED_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onStatus(staff.id, "approved")}
          className="btn-primary flex-1 rounded-xl py-2 text-sm"
        >
          Approve
        </button>
        <button
          onClick={() => onStatus(staff.id, "rejected")}
          className="flex-1 rounded-xl border border-destructive/40 py-2 text-sm text-destructive hover:bg-destructive/10"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: StaffAccount["status"] }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
        status === "approved"
          ? "bg-success/15 text-success"
          : status === "suspended"
            ? "bg-warning/15 text-warning"
            : status === "pending"
              ? "bg-warning/15 text-warning"
              : "bg-destructive/15 text-destructive"
      }`}
    >
      {status}
    </span>
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
