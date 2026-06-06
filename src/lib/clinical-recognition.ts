export type ClinicalUrgency = "routine" | "soon" | "urgent";
export type ClinicalReferenceId =
  | "combined"
  | "harrison"
  | "davidson"
  | "oxfordClinical"
  | "oxfordEmergency"
  | "clinicalMethods";

export interface ClinicalRecognitionInput {
  description: string;
  age?: number;
  bp?: string;
  pulse?: string;
  temp?: string;
  spo2?: string;
  history?: string;
}

export interface ClinicalPattern {
  id: string;
  title: string;
  urgency: ClinicalUrgency;
  confidence: number;
  matched: string[];
  rationale: string;
  differentials: string[];
  watchFor: string[];
  examine: string[];
  tests: string[];
  referenceLens: string;
}

export interface ClinicalRecognitionResult {
  keySymptoms: string[];
  primaryConcern: string;
  combinedClarification: string;
  combinedAssistance: string[];
  overallDetail: ClinicalDetailSection[];
  referenceOptions: ClinicalReferenceOption[];
  patterns: ClinicalPattern[];
  safetyNote: string;
}

export interface ClinicalDetailSection {
  title: string;
  items: string[];
}

export interface ClinicalReferenceOption {
  id: Exclude<ClinicalReferenceId, "combined">;
  label: string;
  shortLabel: string;
  scope: string;
  guidance: string;
  focus: string[];
  detailSections: ClinicalDetailSection[];
}

interface Rule {
  id: string;
  title: string;
  urgency: ClinicalUrgency;
  terms: string[];
  differentials: string[];
  watchFor: string[];
  examine: string[];
  tests: string[];
  rationale: string;
  referenceLens: string;
}

const RULES: Rule[] = [
  {
    id: "chest-pain",
    title: "Cardiac chest pain / acute coronary syndrome to rule out",
    urgency: "urgent",
    terms: [
      "chest pain",
      "chest tightness",
      "chest discomfort",
      "sweating",
      "diaphoresis",
      "breathlessness",
    ],
    differentials: [
      "Acute coronary syndrome",
      "Aortic syndrome",
      "Pulmonary embolism",
      "Pneumonia or pleurisy",
      "Gastritis / reflux after danger signs are excluded",
    ],
    watchFor: [
      "Radiation to arm, jaw, back, or epigastrium",
      "Syncope, severe sweating, vomiting, or breathlessness",
      "Unequal pulses or tearing back pain",
      "Hypotension, hypoxia, or new arrhythmia",
    ],
    examine: [
      "Repeat vitals and pain score",
      "Cardiovascular and respiratory exam",
      "Peripheral pulses and blood pressure in both arms if severe",
      "Signs of heart failure or shock",
    ],
    tests: [
      "ECG immediately",
      "Troponin serially as per protocol",
      "CBC, electrolytes, renal function, glucose",
      "Chest X-ray if respiratory signs or alternate diagnosis",
    ],
    rationale:
      "Chest pain with autonomic symptoms should be treated as potentially cardiac until time-critical causes are excluded.",
    referenceLens: "Harrison-style deep differential plus Oxford emergency/ward approach",
  },
  {
    id: "fever-cough",
    title: "Respiratory infection pattern",
    urgency: "soon",
    terms: ["fever", "cough", "sputum", "shortness of breath", "wheeze", "chills"],
    differentials: [
      "Viral URTI",
      "Pneumonia",
      "Influenza / COVID-like illness",
      "Asthma or COPD exacerbation",
      "Tuberculosis if chronic cough, weight loss, or night sweats",
    ],
    watchFor: [
      "SpO2 below expected range",
      "Fast breathing, confusion, hypotension, or severe weakness",
      "Pleuritic chest pain or hemoptysis",
      "Persistent fever or high-risk comorbidity",
    ],
    examine: [
      "Respiratory rate and oxygen saturation trend",
      "Chest auscultation for focal crepitations or wheeze",
      "Hydration and sepsis screen",
      "ENT and lymph node exam when upper-respiratory symptoms dominate",
    ],
    tests: [
      "CBC and CRP if bacterial infection is possible",
      "Chest X-ray if focal chest signs, hypoxia, or persistent fever",
      "Sputum testing if productive/chronic cough",
      "Blood culture if toxic or sepsis concern",
    ],
    rationale:
      "Fever plus cough needs separation of uncomplicated viral illness from pneumonia, hypoxia, and sepsis risk.",
    referenceLens: "Davidson-style clinical approach with Oxford quick ward checks",
  },
  {
    id: "headache-bp",
    title: "Headache with vascular / neurological red-flag screen",
    urgency: "soon",
    terms: [
      "headache",
      "bp",
      "hypertension",
      "dizziness",
      "vomiting",
      "blurred vision",
      "weakness",
    ],
    differentials: [
      "Primary headache",
      "Severe hypertension-related symptoms",
      "Stroke / TIA if focal deficit",
      "Meningitis if fever and neck stiffness",
      "Intracranial bleed if thunderclap onset",
    ],
    watchFor: [
      "Sudden worst headache or thunderclap onset",
      "Focal weakness, speech change, seizure, confusion, or collapse",
      "Fever with neck stiffness or rash",
      "Papilloedema, pregnancy, immunosuppression, cancer history, or age over 50 with new headache",
    ],
    examine: [
      "Repeat blood pressure after rest",
      "Full neurological exam",
      "Fundoscopy when raised intracranial pressure is a concern",
      "Meningeal signs when fever or neck pain is present",
    ],
    tests: [
      "Urine dip, creatinine, electrolytes when hypertension is significant",
      "ECG if hypertensive urgency/emergency suspected",
      "Neuroimaging urgently if red flags or abnormal neuro exam",
      "CBC/CRP if infection or temporal arteritis concern",
    ],
    rationale:
      "Most headaches are benign, but neurological and blood-pressure danger signs must be actively screened.",
    referenceLens: "Hutchison/Macleod clinical examination focus plus Harrison differential depth",
  },
  {
    id: "abdominal-pain",
    title: "Abdominal pain pattern",
    urgency: "soon",
    terms: [
      "abdominal pain",
      "abdomen pain",
      "epigastric",
      "vomiting",
      "nausea",
      "diarrhea",
      "gastritis",
    ],
    differentials: [
      "Gastritis / peptic disease",
      "Appendicitis",
      "Biliary colic / cholecystitis",
      "Pancreatitis",
      "Bowel obstruction",
      "Urinary or gynecological cause when relevant",
    ],
    watchFor: [
      "Guarding, rigidity, rebound, or severe localized pain",
      "Persistent vomiting, GI bleed, jaundice, or shock",
      "Pregnancy possibility",
      "Severe pain out of proportion or elderly patient with new pain",
    ],
    examine: [
      "Pain site, migration, and peritoneal signs",
      "Hydration and perfusion",
      "Hernial or renal angle tenderness when indicated",
      "Pelvic/testicular exam when clinically relevant",
    ],
    tests: [
      "CBC, electrolytes, LFT, amylase/lipase when upper abdominal pain",
      "Urine routine",
      "Pregnancy test where applicable",
      "Ultrasound or CT depending on localization and severity",
    ],
    rationale:
      "Abdominal pain needs early separation of benign dyspepsia from surgical abdomen and systemic illness.",
    referenceLens: "Davidson concepts with Macleod/Hutchison examination structure",
  },
  {
    id: "sepsis-risk",
    title: "Sepsis / systemic infection screen",
    urgency: "urgent",
    terms: [
      "fever",
      "chills",
      "confusion",
      "very cold",
      "extreme pain",
      "low bp",
      "breathlessness",
      "sepsis",
    ],
    differentials: [
      "Sepsis from respiratory, urinary, skin, or abdominal source",
      "Severe bacterial infection",
      "Septic shock if hypotension or organ dysfunction",
    ],
    watchFor: [
      "Confusion or altered mental status",
      "Low blood pressure, high heart rate, or fast breathing",
      "Clammy skin, severe weakness, or extreme pain",
      "Low oxygen saturation or reduced urine output",
    ],
    examine: [
      "ABCDE assessment",
      "Source search: chest, urine, skin, abdomen, lines/wounds",
      "Perfusion, mental status, urine output",
      "Repeat vitals frequently",
    ],
    tests: [
      "CBC, renal/liver function, lactate where available",
      "Blood cultures before antibiotics if this does not delay care",
      "Urine and chest testing guided by suspected source",
      "Escalate as per sepsis protocol",
    ],
    rationale:
      "Systemic infection signs can progress quickly; recognition and escalation are more important than naming one disease early.",
    referenceLens: "Oxford emergency quick-use approach with internal medicine differential",
  },
];

function normalize(value?: string) {
  return (value ?? "").toLowerCase();
}

function firstNumber(value?: string) {
  const match = value?.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function bpNumbers(value?: string) {
  const match = value?.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  return match ? { systolic: Number(match[1]), diastolic: Number(match[2]) } : undefined;
}

function vitalBoost(rule: Rule, input: ClinicalRecognitionInput) {
  const bp = bpNumbers(input.bp);
  const pulse = firstNumber(input.pulse);
  const temp = firstNumber(input.temp);
  const spo2 = firstNumber(input.spo2);
  let score = 0;
  const matched: string[] = [];

  if (rule.id === "chest-pain" && pulse && pulse >= 100) {
    score += 8;
    matched.push("tachycardia");
  }
  if (rule.id === "fever-cough" && temp && temp >= 100.4) {
    score += 10;
    matched.push("fever on vitals");
  }
  if (rule.id === "fever-cough" && spo2 && spo2 < 95) {
    score += 12;
    matched.push("low oxygen saturation");
  }
  if (rule.id === "headache-bp" && bp && (bp.systolic >= 160 || bp.diastolic >= 100)) {
    score += 12;
    matched.push("elevated blood pressure");
  }
  if (
    rule.id === "sepsis-risk" &&
    ((pulse && pulse >= 100) || (temp && temp >= 100.4) || (spo2 && spo2 < 94))
  ) {
    score += 10;
    matched.push("systemic vital sign concern");
  }

  return { score, matched };
}

function patientContext(input: ClinicalRecognitionInput) {
  const context: string[] = [];
  if (input.age) context.push(`${input.age} years`);
  if (input.history?.trim()) context.push(`history: ${input.history.trim()}`);
  if (input.bp) context.push(`BP ${input.bp}`);
  if (input.pulse) context.push(`pulse ${input.pulse}`);
  if (input.temp) context.push(`temp ${input.temp}`);
  if (input.spo2) context.push(`SpO2 ${input.spo2}`);
  return context.length > 0 ? context.join(" · ") : "clinical context not fully entered";
}

function buildCombinedClarification(patterns: ClinicalPattern[], input: ClinicalRecognitionInput) {
  if (patterns.length === 0) {
    return "Combined clinical view: the entered symptoms and previous diseases do not point strongly to one pattern yet. Start by tightening the history, repeating vitals, and doing a focused system examination before narrowing the diagnosis.";
  }

  const urgent = patterns.find((pattern) => pattern.urgency === "urgent");
  const top = patterns[0];
  const historyPart = input.history?.trim()
    ? " Previous diseases/history should change the threshold for escalation and investigation."
    : " Add previous diseases, medications, pregnancy status where relevant, and allergies to improve the clinical read.";

  return `Combined clinical view: ${top.title} is the leading concern from the entered symptoms and vitals. ${
    urgent
      ? "Handle urgent exclusions first, then refine the differential."
      : "Check red flags first, then refine the likely diagnosis."
  }${historyPart}`;
}

function buildCombinedAssistance(patterns: ClinicalPattern[]) {
  if (patterns.length === 0) {
    return [
      "Clarify onset, duration, progression, severity, triggers, relieving factors, and associated symptoms.",
      "Repeat full vitals and compare them with the compounder intake before deciding risk.",
      "Use focused examination to decide which system is driving the complaint.",
      "Order only tests that answer an immediate clinical question or change management.",
    ];
  }

  const watch = [...new Set(patterns.flatMap((pattern) => pattern.watchFor))].slice(0, 4);
  const exam = [...new Set(patterns.flatMap((pattern) => pattern.examine))].slice(0, 3);
  const tests = [...new Set(patterns.flatMap((pattern) => pattern.tests))].slice(0, 3);

  return [
    `First exclude: ${watch.join("; ")}.`,
    `Focused examination: ${exam.join("; ")}.`,
    `Tests to consider now: ${tests.join("; ")}.`,
    "Document the working concern, danger signs checked, and why the chosen tests or referral are needed.",
  ];
}

function uniqueList(values: string[], fallback: string[]) {
  const list = [...new Set(values.filter(Boolean))];
  return list.length > 0 ? list : fallback;
}

function patternSummary(patterns: ClinicalPattern[]) {
  const top = patterns[0];
  const concern = top?.title ?? "undifferentiated symptoms";
  const differentials = uniqueList(
    patterns.flatMap((pattern) => pattern.differentials),
    ["Keep a broad differential until the history, exam, and vitals point to a system."],
  );
  const watchFor = uniqueList(
    patterns.flatMap((pattern) => pattern.watchFor),
    [
      "New instability, worsening pain, altered sensorium, hypoxia, hypotension, or focal neurological findings.",
    ],
  );
  const examine = uniqueList(
    patterns.flatMap((pattern) => pattern.examine),
    ["Repeat full vitals, inspect general condition, and perform a focused system examination."],
  );
  const tests = uniqueList(
    patterns.flatMap((pattern) => pattern.tests),
    ["Use tests that answer the immediate diagnostic question or change management."],
  );

  return { concern, differentials, watchFor, examine, tests };
}

function buildOverallDetail(
  patterns: ClinicalPattern[],
  input: ClinicalRecognitionInput,
): ClinicalDetailSection[] {
  const context = patientContext(input);
  const summary = patternSummary(patterns);

  if (patterns.length === 0) {
    return [
      {
        title: "Initial overall clarification",
        items: [
          "No strong disease-recognition pattern is detected from the current entry.",
          "Treat this as an incomplete clinical picture: clarify chronology, severity, associated symptoms, and relevant negatives.",
          `Current context: ${context}.`,
        ],
      },
      {
        title: "What the doctor should complete",
        items: [
          "Ask onset, duration, progression, triggers, relieving factors, exposure history, medication use, allergies, and previous disease control.",
          "Repeat vitals and compare them with the compounder intake before deciding risk.",
          "Perform focused examination based on the system suggested by history.",
        ],
      },
      {
        title: "Next clinical step",
        items: [
          "Do not force a diagnosis from weak data.",
          "Order only focused tests that can narrow the differential or change immediate management.",
          "Escalate if instability or red flags emerge during reassessment.",
        ],
      },
    ];
  }

  return [
    {
      title: "Overall disease-recognition summary",
      items: [
        `${summary.concern} is the leading concern from the entered symptoms, previous diseases, and vitals.`,
        `Clinical context: ${context}.`,
        "Previous diseases should change the threshold for urgency, investigations, and referral when they increase risk.",
      ],
    },
    {
      title: "Different possibilities to keep in mind",
      items: summary.differentials.slice(0, 6),
    },
    {
      title: "Things to watch carefully",
      items: summary.watchFor.slice(0, 6),
    },
    {
      title: "Focused bedside assessment",
      items: summary.examine.slice(0, 5),
    },
    {
      title: "Tests and decision support",
      items: [
        ...summary.tests.slice(0, 5),
        "Document the working concern, danger signs checked, and why each test or referral is needed.",
      ],
    },
  ];
}

function buildReferenceOptions(
  patterns: ClinicalPattern[],
  input: ClinicalRecognitionInput,
): ClinicalReferenceOption[] {
  const top = patterns[0];
  const context = patientContext(input);
  const concern = top?.title ?? "undifferentiated symptoms";
  const urgent = patterns.some((pattern) => pattern.urgency === "urgent");
  const summary = patternSummary(patterns);

  return [
    {
      id: "harrison",
      label: "Harrison's Principles of Internal Medicine",
      shortLabel: "Harrison",
      scope: "Deep internal medicine reference",
      guidance: `Use this lens to broaden the differential for ${concern}, connect symptoms with comorbid risk, and think through complications in context of ${context}.`,
      focus: [
        "Deep differential diagnosis and systemic causes",
        "How previous diseases, age, and risk factors modify probability",
        "Complications and when the case needs senior review",
      ],
      detailSections: [
        {
          title: "Harrison-style clinical reasoning",
          items: [
            `Start from ${concern} as a syndrome, then separate immediately dangerous causes from common causes.`,
            `Use the patient context (${context}) to adjust probability, risk, and urgency rather than treating symptoms in isolation.`,
            "Look for systemic involvement, complications, and comorbidity-driven risk before closing on one diagnosis.",
          ],
        },
        {
          title: "Differential depth",
          items: summary.differentials.slice(0, 6),
        },
        {
          title: "High-risk features to actively exclude",
          items: summary.watchFor.slice(0, 6),
        },
        {
          title: "Detailed work-up direction",
          items: [
            ...summary.tests.slice(0, 5),
            "Escalate to senior review when the presentation is atypical, severe, recurrent, or not explained by initial findings.",
          ],
        },
      ],
    },
    {
      id: "davidson",
      label: "Davidson's Principles and Practice of Medicine",
      shortLabel: "Davidson",
      scope: "Concepts plus practical clinical approach",
      guidance: `Use this lens to turn ${concern} into a clear problem list, likely causes, bedside checks, and initial investigation plan.`,
      focus: [
        "Common medical causes before rare diagnoses",
        "Clinical approach that connects symptoms, signs, and investigations",
        "Patient-friendly explanation of the likely pathway",
      ],
      detailSections: [
        {
          title: "Davidson-style practical frame",
          items: [
            `Convert ${concern} into a problem list: symptom cluster, vital-sign concerns, prior disease risks, and immediate exclusions.`,
            "Prioritize common and clinically important causes before rare explanations.",
            "Tie each investigation to a bedside question: confirm, exclude, stage severity, or guide treatment.",
          ],
        },
        {
          title: "Clinical approach",
          items: [
            ...summary.examine.slice(0, 4),
            "Explain the likely pathway to the patient in plain language, including warning signs and follow-up.",
          ],
        },
        {
          title: "Initial investigation plan",
          items: summary.tests.slice(0, 5),
        },
      ],
    },
    {
      id: "oxfordClinical",
      label: "Oxford Handbook of Clinical Medicine",
      shortLabel: "Oxford Clinical",
      scope: "Daily ward and OPD quick reference",
      guidance: `Use this lens for a concise ward-style checklist: what to check now, what not to miss, and what to document before moving on.`,
      focus: [
        "Quick bedside assessment and ward priorities",
        "Concise red-flag and investigation checklist",
        "Practical follow-up and safety-netting points",
      ],
      detailSections: [
        {
          title: "Oxford Clinical ward checklist",
          items: [
            "Identify what needs action today, what can wait, and what must be safety-netted.",
            `For ${concern}, compare the symptom story with vitals and previous disease burden before deciding OPD versus observation/admission.`,
            "Keep documentation concise: concern, red flags checked, plan, and review trigger.",
          ],
        },
        {
          title: "Ward/OPD checks",
          items: summary.examine.slice(0, 5),
        },
        {
          title: "Safety-netting",
          items: summary.watchFor.slice(0, 5),
        },
      ],
    },
    {
      id: "oxfordEmergency",
      label: "Oxford Handbook of Emergency Medicine",
      shortLabel: "Oxford Emergency",
      scope: "Emergency quick-use reference",
      guidance: urgent
        ? `Use this lens first because the entered picture contains urgent features. Prioritize stabilization, escalation, and time-critical exclusions.`
        : `Use this lens to screen whether ${concern} has any time-critical danger signs before routine management.`,
      focus: [
        "ABCDE-style immediate assessment",
        "Escalation triggers and stabilization priorities",
        "Time-critical investigations and referral decisions",
      ],
      detailSections: [
        {
          title: "Oxford Emergency immediate frame",
          items: [
            urgent
              ? "This presentation has urgent features; assess stability first and escalate early if abnormal vitals or danger signs persist."
              : "Screen first for time-critical features before routine management.",
            "Use an ABCDE-style pass when the patient looks unwell, has abnormal vitals, or has symptoms suggesting rapid deterioration.",
            "Do not delay escalation for perfect diagnostic certainty when danger signs are present.",
          ],
        },
        {
          title: "Emergency triggers",
          items: summary.watchFor.slice(0, 6),
        },
        {
          title: "Time-critical actions/tests",
          items: [
            ...summary.tests.slice(0, 5),
            "Repeat vitals after intervention or observation and document response.",
          ],
        },
      ],
    },
    {
      id: "clinicalMethods",
      label: "Macleod's Clinical Examination / Hutchison's Clinical Methods",
      shortLabel: "Clinical Methods",
      scope: "History, examination, and case presentation",
      guidance: `Use this lens to improve the symptom story and case presentation: chronology, relevant negatives, focused examination, and concise bedside summary.`,
      focus: [
        "Structured history from symptom to system review",
        "Focused examination signs to confirm or redirect the diagnosis",
        "Case-presentation wording for rounds or referral",
      ],
      detailSections: [
        {
          title: "Clinical Methods history structure",
          items: [
            `Present the case as: patient details, chief complaint, chronology, associated symptoms, previous diseases, relevant negatives, and focused examination.`,
            "Ask the doctor to clarify onset, duration, progression, site/radiation where relevant, severity, aggravating/relieving factors, and impact on function.",
            "Previous diseases, medication history, allergy history, and family/social history should be linked back to the current symptom.",
          ],
        },
        {
          title: "Focused examination signs",
          items: summary.examine.slice(0, 5),
        },
        {
          title: "Case-presentation emphasis",
          items: [
            `Lead with ${concern}, then state why the current findings support or weaken it.`,
            "Mention red flags checked and important negatives rather than listing every normal finding.",
            "End with a clear working impression, immediate plan, and review/escalation trigger.",
          ],
        },
      ],
    },
  ];
}

export function analyzeClinicalDescription(
  input: ClinicalRecognitionInput,
): ClinicalRecognitionResult {
  const text = normalize(
    `${input.description} ${input.history ?? ""} ${input.bp ? `bp ${input.bp}` : ""}`,
  );
  const patterns = RULES.map((rule): ClinicalPattern | null => {
    const matchedTerms = rule.terms.filter((term) => text.includes(term));
    const boost = vitalBoost(rule, input);
    const rawScore = matchedTerms.length * 18 + boost.score;
    if (rawScore === 0) return null;

    return {
      ...rule,
      matched: [...matchedTerms, ...boost.matched],
      confidence: Math.min(94, 48 + rawScore),
    };
  })
    .filter((pattern): pattern is ClinicalPattern => Boolean(pattern))
    .sort((a, b) => {
      const urgencyRank: Record<ClinicalUrgency, number> = { urgent: 3, soon: 2, routine: 1 };
      return urgencyRank[b.urgency] - urgencyRank[a.urgency] || b.confidence - a.confidence;
    });

  const keySymptoms = [...new Set(patterns.flatMap((pattern) => pattern.matched))].slice(0, 6);

  if (patterns.length === 0) {
    return {
      keySymptoms: ["no strong pattern detected"],
      primaryConcern: "Start with full history, vitals, and system examination",
      combinedClarification: buildCombinedClarification([], input),
      combinedAssistance: buildCombinedAssistance([]),
      overallDetail: buildOverallDetail([], input),
      referenceOptions: buildReferenceOptions([], input),
      patterns: [],
      safetyNote:
        "This helper is clinical decision support, not a diagnosis. Use clinician judgement and local protocols.",
    };
  }

  const limitedPatterns = patterns.slice(0, 3);
  return {
    keySymptoms,
    primaryConcern: patterns[0].title,
    combinedClarification: buildCombinedClarification(limitedPatterns, input),
    combinedAssistance: buildCombinedAssistance(limitedPatterns),
    overallDetail: buildOverallDetail(limitedPatterns, input),
    referenceOptions: buildReferenceOptions(limitedPatterns, input),
    patterns: limitedPatterns,
    safetyNote:
      "This helper suggests what to consider; it does not replace diagnosis, emergency escalation, or local guidelines.",
  };
}
