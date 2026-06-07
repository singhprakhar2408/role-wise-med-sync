import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  currentUser,
  getPrescriptionOrders,
  subscribePrescriptionOrders,
  updatePrescriptionOrder,
  type PrescriptionOrder,
} from "@/lib/mediflow-store";

export const Route = createFileRoute("/pharmacy")({
  head: () => ({ meta: [{ title: "Pharmacy — MediFlow Clinical" }] }),
  component: Pharmacy,
});

function Pharmacy() {
  const user = currentUser();
  const hospitalCode = user?.hospitalCode ?? "";
  const [rx, setRx] = useState<PrescriptionOrder[]>([]);
  const pending = useMemo(() => rx.filter((r) => r.status === "pending"), [rx]);
  const dispensed = useMemo(() => rx.filter((r) => r.status === "dispensed"), [rx]);

  useEffect(() => {
    if (!hospitalCode) return;
    let cancelled = false;
    const refresh = () => {
      getPrescriptionOrders(hospitalCode)
        .then((rows) => {
          if (!cancelled) setRx(rows);
        })
        .catch(() => {
          if (!cancelled) setRx([]);
        });
    };
    void refresh();
    const unsubscribe = subscribePrescriptionOrders(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [hospitalCode]);

  const markDispensed = async (order: PrescriptionOrder) => {
    if (!hospitalCode) return;
    try {
      await updatePrescriptionOrder(hospitalCode, order.id, {
        status: "dispensed",
        dispensedAt: Date.now(),
        dispensedById: user?.id,
        dispensedByName: user?.fullName,
      });
      setRx(await getPrescriptionOrders(hospitalCode));
      toast.success("Marked dispensed", { description: `${order.patient} · ${order.id}` });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <AppShell title="Pharmacy · Dispensing">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="glass rounded-full px-3 py-1.5">
          Pending: <span className="text-warning font-semibold">{pending.length}</span>
        </span>
        <span className="glass rounded-full px-3 py-1.5">
          Dispensed: <span className="text-success font-semibold">{dispensed.length}</span>
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {rx.length === 0 && (
          <div className="glass-strong rounded-2xl p-5 text-sm text-muted-foreground">
            No prescriptions have been sent to pharmacy yet.
          </div>
        )}
        {rx.map((r) => (
          <PrescriptionCard key={r.id} order={r} onDispense={() => markDispensed(r)} />
        ))}
      </div>
    </AppShell>
  );
}

function PrescriptionCard({
  order,
  onDispense,
}: {
  order: PrescriptionOrder;
  onDispense: () => void;
}) {
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] text-primary">
            {order.id} · {order.patientId}
          </div>
          <div className="mt-0.5 text-sm font-medium">{order.patient}</div>
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${order.status === "pending" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}
        >
          {order.status}
        </span>
      </div>

      <div className="mt-4 glass rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-white/[0.03]">
            <tr>
              <th className="text-left px-3 py-2">Medicine</th>
              <th className="text-left px-3 py-2 hidden md:table-cell">Salt</th>
              <th className="text-left px-3 py-2">Dose</th>
              <th className="text-left px-3 py-2">Freq</th>
              <th className="text-left px-3 py-2">Days</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="px-3 py-2 font-medium">{it.med}</td>
                <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                  {it.salt || "—"}
                </td>
                <td className="px-3 py-2">{it.dose || "—"}</td>
                <td className="px-3 py-2">{it.freq || "—"}</td>
                <td className="px-3 py-2">{it.days || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        Ordered {new Date(order.orderedAt).toLocaleString()}
      </div>
      {order.status === "pending" && (
        <button onClick={onDispense} className="btn-primary mt-4 rounded-xl px-4 py-2 text-sm">
          Mark dispensed
        </button>
      )}
    </div>
  );
}
