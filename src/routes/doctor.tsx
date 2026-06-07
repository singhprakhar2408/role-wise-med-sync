import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SmartInput } from "@/components/SmartInput";
import {
  analyzeClinicalDescription,
  type ClinicalDetailSection,
  type ClinicalPattern,
  type ClinicalRecognitionResult,
  type ClinicalReferenceId,
} from "@/lib/clinical-recognition";
import {
  addLabOrdersForPatient,
  addPrescriptionForPatient,
  currentUser,
  getLabOrders,
  getPatientQueue,
  getPrescriptionOrders,
  subscribeLabOrders,
  subscribePatientQueue,
  subscribePrescriptionOrders,
  updatePatientQueueRecord,
  type LabOrder,
  type PatientQueueRecord,
  type PatientQueueStatus,
  type PrescriptionItem,
  type PrescriptionOrder,
} from "@/lib/mediflow-store";

export const Route = createFileRoute("/doctor")({
  head: () => ({ meta: [{ title: "Doctor Queue — MediFlow Clinical" }] }),
  component: Doctor,
});

type Status = PatientQueueStatus;
type QP = PatientQueueRecord;

const STATUS_TONE: Record<Status, string> = {
  waiting_for_doctor: "bg-warning/15 text-warning",
  under_review: "bg-primary/15 text-primary",
  lab_pending: "bg-accent/15 text-accent",
  lab_report_received: "bg-success/20 text-success ring-1 ring-success/40",
  pharmacy_pending: "bg-accent/15 text-accent",
  closed: "bg-white/10 text-muted-foreground",
};

// Distinct row highlight when lab report has arrived
const ROW_TONE: Partial<Record<Status, string>> = {
  lab_report_received: "ring-1 ring-success/60 bg-success/10",
};

const LAB_STATUS_TONE: Record<LabOrder["status"], string> = {
  pending: "bg-warning/15 text-warning",
  sample_collected: "bg-accent/15 text-accent",
  processing: "bg-primary/15 text-primary",
  report_uploaded: "bg-success/15 text-success",
};

const TABS = [
  "Review",
  "Clinical Assist",
  "Tests",
  "Lab Reports",
  "Prescription",
  "History",
] as const;
type Tab = (typeof TABS)[number];

function Doctor() {
  const user = currentUser();
  const hospitalCode = user?.hospitalCode ?? "";
  const [queue, setQueue] = useState<QP[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Review");
  const [closeOpen, setCloseOpen] = useState(false);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionOrder[]>([]);

  useEffect(() => {
    if (!hospitalCode) return;
    let cancelled = false;
    const refresh = () => {
      getPatientQueue(hospitalCode)
        .then((rows) => {
          if (!cancelled) setQueue(rows);
        })
        .catch(() => {
          if (!cancelled) setQueue([]);
        });
    };
    void refresh();
    const unsubscribe = subscribePatientQueue(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [hospitalCode]);

  useEffect(() => {
    if (!hospitalCode) return;
    let cancelled = false;
    const refresh = () => {
      getLabOrders(hospitalCode)
        .then((rows) => {
          if (!cancelled) setLabOrders(rows);
        })
        .catch(() => {
          if (!cancelled) setLabOrders([]);
        });
    };
    void refresh();
    const unsubscribe = subscribeLabOrders(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [hospitalCode]);

  useEffect(() => {
    let cancelled = false;
    if (!hospitalCode) {
      setPrescriptions([]);
      return;
    }
    getPrescriptionOrders(hospitalCode)
      .then((rows) => {
        if (!cancelled) setPrescriptions(rows);
      })
      .catch(() => {
        if (!cancelled) setPrescriptions([]);
      });
    const unsubscribe = subscribePrescriptionOrders(() => {
      getPrescriptionOrders(hospitalCode)
        .then((rows) => {
          if (!cancelled) setPrescriptions(rows);
        })
        .catch(() => {
          if (!cancelled) setPrescriptions([]);
        });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [hospitalCode]);

  useEffect(() => {
    if (selected && queue.some((q) => q.id === selected)) return;
    setSelected(queue[0]?.id ?? null);
  }, [queue, selected]);

  const labStatusFor = (patientId: string, fallback: Status): Status => {
    const orders = labOrders.filter((o) => o.patientId === patientId);
    if (orders.some((o) => o.status === "report_uploaded")) return "lab_report_received";
    if (orders.some((o) => o.status !== "report_uploaded")) return "lab_pending";
    return fallback;
  };
  const queueWithLabStatus = queue.map((q) => ({ ...q, status: labStatusFor(q.id, q.status) }));
  const p = queueWithLabStatus.find((q) => q.id === selected) ?? null;
  const selectedLabOrders = p
    ? labOrders
        .filter((o) => o.patientId === p.id)
        .sort((a, b) => (b.completedAt ?? b.orderedAt) - (a.completedAt ?? a.orderedAt))
    : [];
  const selectedUploadedReports = selectedLabOrders.filter((o) => o.status === "report_uploaded");
  const selectedPrescriptions = p ? prescriptions.filter((o) => o.patientId === p.id) : [];
  const clinicalRecognition = p
    ? analyzeClinicalDescription({
        description: patientClinicalDescription(p),
        age: p.age,
        bp: p.bp,
        pulse: p.pulse,
        temp: p.temp,
        spo2: p.spo2,
        history: patientClinicalHistory(p),
      })
    : null;
  const setStatus = (id: string, s: Status) =>
    setQueue((q) => q.map((x) => (x.id === id ? { ...x, status: s } : x)));
  const updateStatus = async (id: string, s: Status) => {
    setStatus(id, s);
    if (!hospitalCode) return;
    try {
      await updatePatientQueueRecord(hospitalCode, id, { status: s });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  const removeFromQueue = async (id: string) => {
    setQueue((q) => q.filter((x) => x.id !== id));
    if (!hospitalCode) return;
    try {
      await updatePatientQueueRecord(hospitalCode, id, { status: "closed" });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onClosed = (mode: "followup" | "admit" | "all_fine", extra?: string) => {
    if (!p) return;
    void updateStatus(p.id, "closed");
    setCloseOpen(false);
    if (mode === "followup")
      toast.success("File closed · Follow-up scheduled", { description: `${p.name} → ${extra}` });
    else if (mode === "admit")
      toast.success("Patient admitted", {
        description: `${p.name} transferred to Receptionist for admission.`,
      });
    else
      toast.success("File closed", { description: `${p.name} · All fine, no follow-up needed.` });
    // refresh selection
    const next = queue.find((x) => x.id !== p.id && x.status !== "closed");
    setSelected(next?.id ?? null);
    setTab("Review");
  };

  return (
    <AppShell title="Doctor · Clinical workspace">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="glass rounded-full px-3 py-1.5">
          Total in queue:{" "}
          <span className="text-primary font-semibold">{queueWithLabStatus.length}</span>
        </span>
        <span className="glass rounded-full px-3 py-1.5">
          Awaiting review:{" "}
          <span className="text-warning font-semibold">
            {queueWithLabStatus.filter((q) => q.status === "waiting_for_doctor").length}
          </span>
        </span>
        <span className="glass rounded-full px-3 py-1.5">
          Lab pending:{" "}
          <span className="text-accent font-semibold">
            {queueWithLabStatus.filter((q) => q.status === "lab_pending").length}
          </span>
        </span>
        <span className="glass rounded-full px-3 py-1.5">
          Reports back:{" "}
          <span className="text-success font-semibold">
            {queueWithLabStatus.filter((q) => q.status === "lab_report_received").length}
          </span>
        </span>
        <Link to="/records" className="glass rounded-full px-3 py-1.5 hover:bg-white/10">
          Full patient records →
        </Link>
      </div>
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        {/* Queue */}
        <aside className="glass-strong rounded-2xl p-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
              Patient queue
            </h2>
            <span className="text-xs text-primary">{queue.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {queueWithLabStatus.map((qp) => (
              <button
                key={qp.id}
                onClick={() => {
                  setSelected(qp.id);
                  setTab("Review");
                }}
                className={`w-full text-left glass rounded-xl p-3 transition ${selected === qp.id ? "ring-1 ring-primary/50" : "hover:bg-white/10"} ${ROW_TONE[qp.status] ?? ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[11px] text-primary">{qp.id}</div>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_TONE[qp.status]}`}
                  >
                    {qp.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium truncate">
                  {qp.name}{" "}
                  <span className="text-muted-foreground text-xs">
                    · {qp.age}/{qp.gender}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{qp.complaint}</div>
                <QueueClinicalCue patient={qp} />
                {qp.status === "lab_report_received" && (
                  <div className="mt-1.5 text-[10px] uppercase tracking-wider text-success animate-pulse">
                    ● Lab report ready
                  </div>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Detail */}
        <section className="glass-strong rounded-2xl p-5">
          {!p ? (
            <div className="text-muted-foreground text-sm">Select a patient.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-primary">{p.id}</div>
                  <h2 className="text-xl mt-0.5">
                    {p.name}{" "}
                    <span className="text-muted-foreground text-sm">
                      · {p.age}/{p.gender}
                    </span>
                  </h2>
                  <div className="text-sm text-muted-foreground">{p.complaint}</div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_TONE[p.status]}`}
                >
                  {p.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Full detailed patient record snapshot */}
              <div className="mt-4 grid sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <Mini k="BP" v={p.bp} /> <Mini k="Pulse" v={p.pulse} />
                <Mini k="Temp" v={p.temp} /> <Mini k="SpO₂" v={p.spo2} />
                <Mini k="Weight" v={p.weight} /> <Mini k="Allergies" v={p.allergies} />
                <Mini k="Compounder symptoms" v={p.symptoms} wide />
                <Mini k="Previous diseases" v={patientClinicalHistory(p)} wide />
                {p.assignedTo && <Mini k="Assigned from intake" v={p.assignedTo} wide />}
              </div>

              {clinicalRecognition && clinicalRecognition.patterns.length > 0 && (
                <button
                  onClick={() => setTab("Clinical Assist")}
                  className={`mt-4 w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    clinicalRecognition.patterns[0].urgency === "urgent"
                      ? "border-destructive/35 bg-destructive/10 hover:bg-destructive/15"
                      : "border-warning/30 bg-warning/10 hover:bg-warning/15"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      Clinical cue: {clinicalRecognition.primaryConcern}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider">
                      {clinicalRecognition.patterns[0].urgency}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Key symptoms: {clinicalRecognition.keySymptoms.join(", ")}
                  </div>
                </button>
              )}

              {selectedUploadedReports.length > 0 && (
                <button
                  onClick={() => setTab("Lab Reports")}
                  className="mt-4 w-full rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-left transition hover:bg-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-success">
                      Laboratory report ready
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-success">
                      {selectedUploadedReports.length} submitted
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Latest: {selectedUploadedReports[0].test} · {selectedUploadedReports[0].summary}
                  </div>
                </button>
              )}

              {/* Tabs */}
              <div className="mt-5 flex gap-1 overflow-x-auto glass rounded-xl p-1">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap ${tab === t ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t}
                    {t === "Lab Reports" && selectedUploadedReports.length > 0 && (
                      <span className="ml-1 rounded-full bg-success/20 px-1.5 py-0.5 text-[10px] text-success">
                        {selectedUploadedReports.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                {tab === "Review" && <Review />}
                {tab === "Clinical Assist" && p && (
                  <ClinicalAssist patient={p} initial={clinicalRecognition} />
                )}
                {tab === "Tests" && (
                  <Tests
                    onSent={async (tests) => {
                      try {
                        await addLabOrdersForPatient({
                          hospitalCode,
                          patientId: p.id,
                          patient: p.name,
                          tests,
                          orderedById: user?.id,
                          orderedByName: user?.fullName,
                        });
                        setLabOrders(await getLabOrders(hospitalCode));
                        await updateStatus(p.id, "lab_pending");
                        toast.success("Sent to Laboratory", {
                          description: `${p.name} · ${tests.length} test${tests.length === 1 ? "" : "s"} awaiting report`,
                        });
                      } catch (error) {
                        toast.error((error as Error).message);
                      }
                    }}
                  />
                )}
                {tab === "Lab Reports" && <LabReports orders={selectedLabOrders} />}
                {tab === "Prescription" && (
                  <Prescription
                    onSent={async (items) => {
                      try {
                        await addPrescriptionForPatient({
                          hospitalCode,
                          patientId: p.id,
                          patient: p.name,
                          items,
                          orderedById: user?.id,
                          orderedByName: user?.fullName,
                        });
                        setPrescriptions(await getPrescriptionOrders(hospitalCode));
                        await updateStatus(p.id, "pharmacy_pending");
                        toast.success("Sent to Pharmacy", {
                          description: `${p.name} · prescription queued`,
                        });
                      } catch (error) {
                        toast.error((error as Error).message);
                      }
                    }}
                  />
                )}
                {tab === "History" && (
                  <History
                    patient={p}
                    labOrders={selectedLabOrders}
                    prescriptions={selectedPrescriptions}
                  />
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setCloseOpen(true)}
                  className="btn-primary rounded-xl px-4 py-2 text-sm"
                >
                  Close file
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {closeOpen && p && (
        <CloseFileModal
          patient={p}
          onClose={() => setCloseOpen(false)}
          onDone={onClosed}
          onAdmitted={() => {
            void removeFromQueue(p.id);
          }}
        />
      )}
    </AppShell>
  );
}

function Mini({ k, v, wide }: { k: string; v?: string; wide?: boolean }) {
  return (
    <div className={`glass rounded-lg px-3 py-2 ${wide ? "sm:col-span-2 md:col-span-4" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="text-sm">{v || "—"}</div>
    </div>
  );
}

function uniqueText(parts: Array<string | undefined>) {
  const seen = new Set<string>();
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(". ");
}

function patientClinicalDescription(patient: QP) {
  return uniqueText([patient.complaint, patient.symptoms]);
}

function patientClinicalHistory(patient: QP) {
  return uniqueText([patient.previousDiseases, patient.history]);
}

function QueueClinicalCue({ patient }: { patient: QP }) {
  const result = analyzeClinicalDescription({
    description: patientClinicalDescription(patient),
    age: patient.age,
    bp: patient.bp,
    pulse: patient.pulse,
    temp: patient.temp,
    spo2: patient.spo2,
    history: patientClinicalHistory(patient),
  });
  const top = result.patterns[0];
  if (!top) return null;

  return (
    <div
      className={`mt-2 rounded-lg px-2 py-1.5 text-[10px] leading-snug ${
        top.urgency === "urgent"
          ? "bg-destructive/10 text-destructive"
          : "bg-warning/10 text-warning"
      }`}
    >
      <span className="uppercase tracking-wider">{top.urgency} cue</span>
      <span className="text-muted-foreground"> · {result.keySymptoms.slice(0, 3).join(", ")}</span>
    </div>
  );
}

function Review() {
  const [diagnosis, setDiagnosis] = useState("");
  const [system, setSystem] = useState("");
  const [organ, setOrgan] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <SmartInput
        label="Working diagnosis"
        field="diagnosis"
        value={diagnosis}
        onChange={setDiagnosis}
      />
      <SmartInput label="Body system" field="body_system" value={system} onChange={setSystem} />
      <SmartInput label="Organ / deep part" field="organ" value={organ} onChange={setOrgan} />
      <SmartInput label="Add symptom" field="symptom" value={""} onChange={() => {}} />
      <label className="md:col-span-2 block">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Doctor notes
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm ring-focus"
        />
      </label>
    </div>
  );
}

function ClinicalAssist({
  patient,
  initial: _initial,
}: {
  patient: QP;
  initial: ClinicalRecognitionResult | null;
}) {
  const patientDescription = patientClinicalDescription(patient);
  const patientHistory = patientClinicalHistory(patient);
  const [description, setDescription] = useState(patientDescription);
  const [history, setHistory] = useState(patientHistory);
  const [referenceMode, setReferenceMode] = useState<ClinicalReferenceId | null>(null);

  useEffect(() => {
    setDescription(patientDescription);
    setHistory(patientHistory);
    setReferenceMode(null);
  }, [patient.id, patientDescription, patientHistory]);

  const result = analyzeClinicalDescription({
    description,
    age: patient.age,
    bp: patient.bp,
    pulse: patient.pulse,
    temp: patient.temp,
    spo2: patient.spo2,
    history,
  });
  const active = result;

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Clinical recognition
            </div>
            <h3 className="mt-1 text-lg">Combined symptom and history support</h3>
          </div>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-[10px] uppercase tracking-wider text-primary">
            Combined first
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Symptoms / medical description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm ring-focus"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Previous diseases / doctor history
            </span>
            <textarea
              value={history}
              onChange={(e) => setHistory(e.target.value)}
              rows={4}
              placeholder="Comorbidities, past illness, surgery, pregnancy status where relevant, allergies, long-term medicines..."
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm ring-focus"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(active?.keySymptoms ?? []).map((symptom) => (
            <span
              key={symptom}
              className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              {symptom}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Overall clinical assist
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed">{active.combinedClarification}</p>
          </div>
          <span className="rounded-full bg-white/[0.08] px-3 py-1 text-[10px] uppercase tracking-wider text-primary">
            Visible by default
          </span>
        </div>
        <ClinicalList title="Overall assistance" items={active.combinedAssistance} />
      </div>

      <ReferenceSelector
        result={active}
        referenceMode={referenceMode}
        onChange={setReferenceMode}
      />
    </div>
  );
}

function ReferenceSelector({
  result,
  referenceMode,
  onChange,
}: {
  result: ClinicalRecognitionResult;
  referenceMode: ClinicalReferenceId | null;
  onChange: (mode: ClinicalReferenceId) => void;
}) {
  const selectedReference =
    !referenceMode || referenceMode === "combined"
      ? null
      : (result.referenceOptions.find((option) => option.id === referenceMode) ?? null);
  const showOverallDetail = referenceMode === "combined";

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Detailed clinical assist
          </div>
          <h4 className="mt-1 text-base">Choose Overall or a book to open the detailed version</h4>
        </div>
        <span className="text-[11px] text-muted-foreground">Nothing opens until selected</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ReferenceButton active={referenceMode === "combined"} onClick={() => onChange("combined")}>
          Overall
        </ReferenceButton>
        {result.referenceOptions.map((option) => (
          <ReferenceButton
            key={option.id}
            active={referenceMode === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.shortLabel}
          </ReferenceButton>
        ))}
      </div>

      {showOverallDetail && (
        <DetailedAssistPanel
          eyebrow="Overall detailed clinical assist"
          title={result.primaryConcern}
          description={result.safetyNote}
          sections={result.overallDetail}
        >
          {result.patterns.length > 0 && (
            <div className="mt-4 grid xl:grid-cols-2 gap-3">
              {result.patterns.map((pattern) => (
                <ClinicalPatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          )}
        </DetailedAssistPanel>
      )}

      {selectedReference && (
        <DetailedAssistPanel
          eyebrow={selectedReference.scope}
          title={selectedReference.label}
          description={selectedReference.guidance}
          sections={[
            { title: "Use this book lens for", items: selectedReference.focus },
            ...selectedReference.detailSections,
          ]}
        />
      )}
    </div>
  );
}

function DetailedAssistPanel({
  eyebrow,
  title,
  description,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: ClinicalDetailSection[];
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{eyebrow}</div>
      <h5 className="mt-1 text-base font-medium">{title}</h5>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {sections.map((section) => (
          <ClinicalList key={section.title} title={section.title} items={section.items} />
        ))}
      </div>
      {children}
    </div>
  );
}

function ReferenceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-white/10 text-muted-foreground hover:bg-white/5 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ClinicalPatternCard({ pattern }: { pattern: ClinicalPattern }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {pattern.referenceLens}
          </div>
          <h4 className="mt-1 text-base">{pattern.title}</h4>
        </div>
        <div className="text-right">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
              pattern.urgency === "urgent"
                ? "bg-destructive/15 text-destructive"
                : "bg-warning/15 text-warning"
            }`}
          >
            {pattern.urgency}
          </span>
          <div className="mt-2 font-mono text-sm text-primary">{pattern.confidence}%</div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{pattern.rationale}</p>
      <ClinicalList title="Differentials" items={pattern.differentials} />
      <ClinicalList title="Watch carefully" items={pattern.watchFor} />
      <ClinicalList title="Focused exam" items={pattern.examine} />
      <ClinicalList title="Consider tests" items={pattern.tests} />
    </div>
  );
}

function ClinicalList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3 rounded-xl bg-white/[0.04] p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tests({ onSent }: { onSent: (tests: string[]) => void | Promise<void> }) {
  const [list, setList] = useState<string[]>([]);
  const [t, setT] = useState("");
  const send = () => {
    if (list.length === 0) {
      toast.error("Add at least one test");
      return;
    }
    void onSent(list);
    setList([]);
    setT("");
  };
  return (
    <div>
      <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
        <SmartInput label="Add test" field="test" value={t} onChange={setT} />
        <button
          onClick={() => {
            if (t.trim()) {
              setList([...list, t]);
              setT("");
            }
          }}
          className="rounded-xl px-4 py-2.5 text-sm border border-white/10 hover:bg-white/5"
        >
          Add
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {list.map((x, i) => (
          <span key={i} className="glass rounded-full px-3 py-1.5 text-xs flex items-center gap-2">
            {x}
            <button
              onClick={() => setList(list.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive"
            >
              ×
            </button>
          </span>
        ))}
        {list.length === 0 && (
          <span className="text-xs text-muted-foreground">No tests added.</span>
        )}
      </div>
      <button onClick={send} className="btn-primary mt-5 rounded-xl px-5 py-2.5 text-sm">
        Send to Laboratory →
      </button>
    </div>
  );
}

function LabReports({ orders }: { orders: LabOrder[] }) {
  const completed = orders.filter((o) => o.status === "report_uploaded");
  const pending = orders.filter((o) => o.status !== "report_uploaded");

  if (orders.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 text-sm text-muted-foreground">
        No laboratory orders have been sent for this patient yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground">
            Submitted laboratory reports
          </h3>
          <span className="text-xs text-success">{completed.length}</span>
        </div>
        <div className="space-y-3">
          {completed.length === 0 && (
            <div className="glass rounded-xl p-4 text-sm text-muted-foreground">
              No submitted reports yet.
            </div>
          )}
          {completed.map((o) => (
            <div key={o.id} className="glass rounded-2xl p-4 ring-1 ring-success/30">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[11px] text-primary">{o.id}</div>
                  <div className="mt-1 text-sm font-medium">{o.test}</div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${LAB_STATUS_TONE[o.status]}`}
                >
                  report submitted
                </span>
              </div>
              {o.summary && (
                <div className="mt-3 rounded-xl bg-white/[0.05] p-3 text-sm leading-relaxed">
                  {o.summary}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>Submitted by {o.uploadedByName ?? "Laboratory"}</span>
                {o.completedAt && <span>{new Date(o.completedAt).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pending.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm uppercase tracking-wider text-muted-foreground">
              Orders still in lab
            </h3>
            <span className="text-xs text-accent">{pending.length}</span>
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            {pending.map((o) => (
              <div key={o.id} className="glass rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-primary">{o.id}</div>
                    <div className="mt-1 truncate text-sm">{o.test}</div>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${LAB_STATUS_TONE[o.status]}`}
                  >
                    {o.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Ordered {new Date(o.orderedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Prescription({ onSent }: { onSent: (items: PrescriptionItem[]) => void | Promise<void> }) {
  const [rows, setRows] = useState<
    Array<{
      med: string;
      salt: string;
      dose: string;
      freq: string;
      days: string;
      route: string;
      instr: string;
    }>
  >([{ med: "", salt: "", dose: "", freq: "", days: "", route: "", instr: "" }]);
  const update = (i: number, k: string, v: string) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const send = () => {
    const items = rows
      .filter((r) => r.med.trim())
      .map(({ med, salt, dose, freq, days, route, instr }) => ({
        med,
        salt,
        dose,
        freq,
        days,
        route,
        instr,
      }));
    if (items.length === 0) {
      toast.error("Add at least one medicine");
      return;
    }
    void onSent(items);
    setRows([{ med: "", salt: "", dose: "", freq: "", days: "", route: "", instr: "" }]);
  };
  return (
    <div>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="glass rounded-xl p-3 grid grid-cols-2 md:grid-cols-7 gap-2">
            <SmartInput
              field="medicine"
              value={r.med}
              onChange={(v) => update(i, "med", v)}
              placeholder="Medicine"
            />
            <SmartInput
              field="salt"
              value={r.salt}
              onChange={(v) => update(i, "salt", v)}
              placeholder="Salt"
            />
            <input
              value={r.dose}
              onChange={(e) => update(i, "dose", e.target.value)}
              placeholder="Dose"
              className="input"
            />
            <SmartInput
              field="frequency"
              value={r.freq}
              onChange={(v) => update(i, "freq", v)}
              placeholder="Freq"
            />
            <input
              value={r.days}
              onChange={(e) => update(i, "days", e.target.value)}
              placeholder="Days"
              className="input"
            />
            <SmartInput
              field="route"
              value={r.route}
              onChange={(v) => update(i, "route", v)}
              placeholder="Route"
            />
            <input
              value={r.instr}
              onChange={(e) => update(i, "instr", e.target.value)}
              placeholder="Instruction"
              className="input col-span-2 md:col-span-1"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() =>
            setRows([
              ...rows,
              { med: "", salt: "", dose: "", freq: "", days: "", route: "", instr: "" },
            ])
          }
          className="rounded-xl px-4 py-2 text-sm border border-white/10 hover:bg-white/5"
        >
          + Add medicine
        </button>
        <button onClick={send} className="btn-primary rounded-xl px-5 py-2 text-sm">
          Send to Pharmacy →
        </button>
      </div>
    </div>
  );
}

function History({
  patient,
  labOrders,
  prescriptions,
}: {
  patient: QP;
  labOrders: LabOrder[];
  prescriptions: PrescriptionOrder[];
}) {
  const items = [
    {
      d: new Date(patient.createdAt).toLocaleDateString(),
      t: `Intake recorded${patient.createdByName ? ` by ${patient.createdByName}` : ""}`,
      c:
        [
          patient.complaint,
          patient.bp ? `BP ${patient.bp}` : "",
          patient.pulse ? `Pulse ${patient.pulse}` : "",
        ]
          .filter(Boolean)
          .join(" · ") || "Intake started",
    },
    ...labOrders.map((order) => ({
      d: new Date(order.completedAt ?? order.orderedAt).toLocaleDateString(),
      t: `${order.test} · ${order.status.replace(/_/g, " ")}`,
      c: order.summary || `Priority ${order.priority}`,
    })),
    ...prescriptions.map((order) => ({
      d: new Date(order.dispensedAt ?? order.orderedAt).toLocaleDateString(),
      t: `Prescription ${order.status}`,
      c: `${order.items.length} item${order.items.length === 1 ? "" : "s"}`,
    })),
  ].slice(0, 8);
  return (
    <ol className="relative border-l border-white/10 pl-5 space-y-4">
      {items.map((i, k) => (
        <li key={k}>
          <span className="absolute -left-1.5 size-3 rounded-full bg-primary shadow-[0_0_12px] shadow-primary" />
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{i.d}</div>
          <div className="text-sm">{i.t}</div>
          <div className="text-xs text-muted-foreground">{i.c}</div>
        </li>
      ))}
    </ol>
  );
}

function CloseFileModal({
  patient,
  onClose,
  onDone,
  onAdmitted,
}: {
  patient: QP;
  onClose: () => void;
  onDone: (mode: "followup" | "admit" | "all_fine", extra?: string) => void;
  onAdmitted: () => void;
}) {
  const [choice, setChoice] = useState<"followup" | "admit" | "all_fine" | null>(null);
  const [followDate, setFollowDate] = useState("");
  const [admitWard, setAdmitWard] = useState("General Ward");
  const [admitNote, setAdmitNote] = useState("");

  const confirm = () => {
    if (choice === "followup") {
      if (!followDate) {
        toast.error("Pick a follow-up date");
        return;
      }
      onDone("followup", new Date(followDate).toLocaleString());
    } else if (choice === "admit") {
      toast.success("Transferred to Receptionist", {
        description: `${patient.name} · ${admitWard}`,
      });
      onAdmitted();
      onDone("admit", admitWard);
    } else if (choice === "all_fine") {
      onDone("all_fine");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-2xl p-6 max-w-lg w-full animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Close file · {patient.id}
        </div>
        <h3 className="mt-1 text-xl">How are you closing {patient.name}?</h3>
        <div className="mt-5 space-y-2">
          <Opt
            active={choice === "followup"}
            onClick={() => setChoice("followup")}
            title="Follow-up required"
            desc="Patient needs to return for review. Choose a date & time."
          />
          <Opt
            active={choice === "admit"}
            onClick={() => setChoice("admit")}
            title="Admit to hospital"
            desc="Transfer to Receptionist for ward admission."
          />
          <Opt
            active={choice === "all_fine"}
            onClick={() => setChoice("all_fine")}
            title="All fine · no follow-up"
            desc="Treatment complete, discharge from active queue."
          />
        </div>

        {choice === "followup" && (
          <div className="mt-4 glass rounded-xl p-3">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Follow-up date & time
            </label>
            <input
              type="datetime-local"
              value={followDate}
              onChange={(e) => setFollowDate(e.target.value)}
              className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm ring-focus"
            />
          </div>
        )}
        {choice === "admit" && (
          <div className="mt-4 glass rounded-xl p-3 space-y-2">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Ward
              </span>
              <select
                value={admitWard}
                onChange={(e) => setAdmitWard(e.target.value)}
                className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                <option>General Ward</option>
                <option>ICU</option>
                <option>HDU</option>
                <option>Surgical Ward</option>
                <option>Pediatric Ward</option>
                <option>Maternity</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Note for receptionist
              </span>
              <textarea
                value={admitNote}
                onChange={(e) => setAdmitNote(e.target.value)}
                rows={2}
                className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg hover:bg-white/5">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!choice}
            className="btn-primary text-sm px-5 py-2 rounded-lg disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function Opt({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left glass rounded-xl p-3 transition ${active ? "ring-1 ring-primary/60 bg-primary/10" : "hover:bg-white/10"}`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
    </button>
  );
}
