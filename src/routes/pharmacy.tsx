import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/pharmacy")({
  head: () => ({ meta: [{ title: "Pharmacy — MediFlow Clinical" }] }),
  component: Pharmacy,
});

interface Rx {
  id: string; patientId: string; patient: string;
  items: Array<{ med: string; salt: string; strength: string; dose: string; freq: string; days: string; route: string }>;
  status: "pending" | "dispensed";
}

const seed: Rx[] = [
  { id: "RX-882", patientId: "P-1284", patient: "Priya Iyer", status: "pending", items: [
    { med: "Pantoprazole", salt: "Pantoprazole Na", strength: "40mg", dose: "1 tab", freq: "OD", days: "5", route: "PO" },
    { med: "Ondansetron", salt: "Ondansetron HCl", strength: "4mg", dose: "1 tab", freq: "BD", days: "3", route: "PO" },
  ]},
  { id: "RX-883", patientId: "P-1287", patient: "Rahul Verma", status: "pending", items: [
    { med: "Amlodipine", salt: "Amlodipine Besilate", strength: "5mg", dose: "1 tab", freq: "OD", days: "30", route: "PO" },
  ]},
  { id: "RX-880", patientId: "P-1291", patient: "Sara Khan", status: "dispensed", items: [
    { med: "Azithromycin", salt: "Azithromycin", strength: "500mg", dose: "1 tab", freq: "OD", days: "3", route: "PO" },
  ]},
];

function Pharmacy() {
  const [rx, setRx] = useState<Rx[]>(seed);
  return (
    <AppShell title="Pharmacy · Dispensing">
      <div className="grid lg:grid-cols-2 gap-4">
        {rx.map(r => (
          <div key={r.id} className="glass-strong rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] text-primary">{r.id} · {r.patientId}</div>
                <div className="mt-0.5 text-sm font-medium">{r.patient}</div>
              </div>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${r.status === "pending" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>{r.status}</span>
            </div>

            <div className="mt-4 glass rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-white/[0.03]">
                  <tr>
                    <th className="text-left px-3 py-2">Medicine</th>
                    <th className="text-left px-3 py-2 hidden md:table-cell">Salt</th>
                    <th className="text-left px-3 py-2">Strength</th>
                    <th className="text-left px-3 py-2">Freq</th>
                    <th className="text-left px-3 py-2">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {r.items.map((it, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="px-3 py-2 font-medium">{it.med}</td>
                      <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{it.salt}</td>
                      <td className="px-3 py-2">{it.strength}</td>
                      <td className="px-3 py-2">{it.freq}</td>
                      <td className="px-3 py-2">{it.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {r.status === "pending" && (
              <button onClick={() => { setRx(list => list.map(x => x.id === r.id ? { ...x, status: "dispensed" } : x)); toast.success("Marked dispensed", { description: `${r.patient} · ${r.id}` }); }}
                className="btn-primary mt-4 rounded-xl px-4 py-2 text-sm">Mark dispensed</button>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
