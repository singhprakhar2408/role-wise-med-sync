-- MediFlow clinical workflow tables.
-- All real clinical workflow data must live here, never in browser storage.

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  display_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL DEFAULT 0,
  gender TEXT NOT NULL DEFAULT '',
  mobile TEXT,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, display_id)
);

CREATE TABLE IF NOT EXISTS public.encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  display_id TEXT NOT NULL,
  complaint TEXT NOT NULL DEFAULT '',
  symptoms TEXT,
  previous_diseases TEXT,
  status TEXT NOT NULL DEFAULT 'waiting_for_doctor'
    CHECK (status IN ('waiting_for_doctor','under_review','lab_pending','lab_report_received','pharmacy_pending','closed')),
  allergies TEXT,
  history TEXT,
  assigned_to TEXT,
  assigned_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_specialty TEXT,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, display_id)
);

CREATE TABLE IF NOT EXISTS public.vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  bp TEXT,
  pulse TEXT,
  temp TEXT,
  spo2 TEXT,
  weight TEXT,
  rr TEXT,
  recorded_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recorded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  display_id TEXT NOT NULL,
  test TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Routine' CHECK (priority IN ('Routine','Urgent','STAT')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sample_collected','processing','report_uploaded')),
  ordered_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ordered_by_name TEXT,
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, display_id)
);

CREATE TABLE IF NOT EXISTS public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  uploaded_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by_name TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lab_order_id)
);

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  display_id TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dispensed')),
  ordered_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ordered_by_name TEXT,
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispensed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dispensed_by_name TEXT,
  dispensed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, display_id)
);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role public.app_role,
  event_type TEXT NOT NULL,
  entity_table TEXT NOT NULL,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS patients_hospital_idx ON public.patients (hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS encounters_hospital_status_idx ON public.encounters (hospital_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS vitals_encounter_idx ON public.vitals (hospital_id, encounter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lab_orders_hospital_status_idx ON public.lab_orders (hospital_id, status, ordered_at DESC);
CREATE INDEX IF NOT EXISTS lab_results_hospital_idx ON public.lab_results (hospital_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS prescriptions_hospital_status_idx ON public.prescriptions (hospital_id, status, ordered_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_hospital_idx ON public.audit_events (hospital_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.clinical_same_hospital(_hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_hospital_id() = _hospital_id;
$$;

REVOKE EXECUTE ON FUNCTION public.current_profile_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clinical_same_hospital(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clinical_same_hospital(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "clinical read patients same hospital" ON public.patients;
CREATE POLICY "clinical read patients same hospital" ON public.patients
FOR SELECT TO authenticated
USING (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor','compounder','lab','pharmacist','records_viewer')
);

DROP POLICY IF EXISTS "compounder creates patients same hospital" ON public.patients;
CREATE POLICY "compounder creates patients same hospital" ON public.patients
FOR INSERT TO authenticated
WITH CHECK (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','compounder')
);

DROP POLICY IF EXISTS "intake updates patients same hospital" ON public.patients;
CREATE POLICY "intake updates patients same hospital" ON public.patients
FOR UPDATE TO authenticated
USING (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','compounder','doctor')
)
WITH CHECK (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','compounder','doctor')
);

DROP POLICY IF EXISTS "clinical read encounters same hospital" ON public.encounters;
CREATE POLICY "clinical read encounters same hospital" ON public.encounters
FOR SELECT TO authenticated
USING (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor','compounder','lab','pharmacist','records_viewer')
);

DROP POLICY IF EXISTS "compounder creates encounters same hospital" ON public.encounters;
CREATE POLICY "compounder creates encounters same hospital" ON public.encounters
FOR INSERT TO authenticated
WITH CHECK (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','compounder')
);

DROP POLICY IF EXISTS "clinical updates encounters same hospital" ON public.encounters;
CREATE POLICY "clinical updates encounters same hospital" ON public.encounters
FOR UPDATE TO authenticated
USING (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','compounder','doctor')
)
WITH CHECK (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','compounder','doctor')
);

DROP POLICY IF EXISTS "clinical read vitals same hospital" ON public.vitals;
CREATE POLICY "clinical read vitals same hospital" ON public.vitals
FOR SELECT TO authenticated
USING (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor','compounder','records_viewer')
);

DROP POLICY IF EXISTS "clinical writes vitals same hospital" ON public.vitals;
CREATE POLICY "clinical writes vitals same hospital" ON public.vitals
FOR INSERT TO authenticated
WITH CHECK (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','compounder','doctor')
);

DROP POLICY IF EXISTS "clinical read lab orders same hospital" ON public.lab_orders;
CREATE POLICY "clinical read lab orders same hospital" ON public.lab_orders
FOR SELECT TO authenticated
USING (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor','lab','records_viewer')
);

DROP POLICY IF EXISTS "doctor creates lab orders same hospital" ON public.lab_orders;
CREATE POLICY "doctor creates lab orders same hospital" ON public.lab_orders
FOR INSERT TO authenticated
WITH CHECK (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor')
);

DROP POLICY IF EXISTS "lab updates lab orders same hospital" ON public.lab_orders;
CREATE POLICY "lab updates lab orders same hospital" ON public.lab_orders
FOR UPDATE TO authenticated
USING (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor','lab')
)
WITH CHECK (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor','lab')
);

DROP POLICY IF EXISTS "clinical read lab results same hospital" ON public.lab_results;
CREATE POLICY "clinical read lab results same hospital" ON public.lab_results
FOR SELECT TO authenticated
USING (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor','lab','records_viewer')
);

DROP POLICY IF EXISTS "lab writes lab results same hospital" ON public.lab_results;
CREATE POLICY "lab writes lab results same hospital" ON public.lab_results
FOR INSERT TO authenticated
WITH CHECK (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','lab')
);

DROP POLICY IF EXISTS "lab updates lab results same hospital" ON public.lab_results;
CREATE POLICY "lab updates lab results same hospital" ON public.lab_results
FOR UPDATE TO authenticated
USING (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','lab')
)
WITH CHECK (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','lab')
);

DROP POLICY IF EXISTS "clinical read prescriptions same hospital" ON public.prescriptions;
CREATE POLICY "clinical read prescriptions same hospital" ON public.prescriptions
FOR SELECT TO authenticated
USING (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor','pharmacist','records_viewer')
);

DROP POLICY IF EXISTS "doctor creates prescriptions same hospital" ON public.prescriptions;
CREATE POLICY "doctor creates prescriptions same hospital" ON public.prescriptions
FOR INSERT TO authenticated
WITH CHECK (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor')
);

DROP POLICY IF EXISTS "pharmacy updates prescriptions same hospital" ON public.prescriptions;
CREATE POLICY "pharmacy updates prescriptions same hospital" ON public.prescriptions
FOR UPDATE TO authenticated
USING (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor','pharmacist')
)
WITH CHECK (
  public.clinical_same_hospital(hospital_id)
  AND public.current_profile_role() IN ('hospital_admin','doctor','pharmacist')
);

DROP POLICY IF EXISTS "audit read same hospital admins" ON public.audit_events;
CREATE POLICY "audit read same hospital admins" ON public.audit_events
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    public.clinical_same_hospital(hospital_id)
    AND public.current_profile_role() = 'hospital_admin'
  )
);

DROP POLICY IF EXISTS "audit insert same hospital users" ON public.audit_events;
CREATE POLICY "audit insert same hospital users" ON public.audit_events
FOR INSERT TO authenticated
WITH CHECK (
  hospital_id IS NULL
  OR public.clinical_same_hospital(hospital_id)
);
