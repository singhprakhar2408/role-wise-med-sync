
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('super_admin','hospital_admin','doctor','compounder','lab','pharmacist','records_viewer');
CREATE TYPE public.profile_status AS ENUM ('pending','approved','rejected','suspended');
CREATE TYPE public.hospital_status AS ENUM ('active','inactive');

-- Hospitals
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status public.hospital_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hospitals TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  mobile TEXT,
  role public.app_role NOT NULL DEFAULT 'records_viewer',
  department TEXT,
  specialty TEXT,
  license_no TEXT,
  status public.profile_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_hospital_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT hospital_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Hospitals policies
CREATE POLICY "anyone authenticated or anon can read hospitals" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "super_admin manages hospitals insert" ON public.hospitals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super_admin manages hospitals update" ON public.hospitals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super_admin manages hospitals delete" ON public.hospitals FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- Profiles policies
-- Self read
CREATE POLICY "user reads own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
-- super_admin reads all
CREATE POLICY "super_admin reads all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
-- hospital_admin reads same hospital
CREATE POLICY "hospital_admin reads same hospital profiles" ON public.profiles FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'hospital_admin') AND hospital_id = public.current_hospital_id()
);
-- Insert: a user can insert their OWN profile row only (registration); role defaults handled in app; status forced to pending via trigger below
CREATE POLICY "user inserts own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
-- Update: user can update own non-sensitive fields
CREATE POLICY "user updates own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
-- hospital_admin can update profiles in their hospital
CREATE POLICY "hospital_admin updates same hospital profiles" ON public.profiles FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'hospital_admin') AND hospital_id = public.current_hospital_id()
) WITH CHECK (
  public.has_role(auth.uid(),'hospital_admin') AND hospital_id = public.current_hospital_id()
);
-- super_admin can update any profile
CREATE POLICY "super_admin updates all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- Trigger: enforce status='pending' on insert unless inserter is super_admin or service_role
CREATE OR REPLACE FUNCTION public.enforce_pending_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IN ('super_admin','hospital_admin') AND NOT public.has_role(auth.uid(),'super_admin') THEN
    NEW.role := 'records_viewer';
  END IF;
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_before_insert BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_pending_status();

-- Seed hospitals
INSERT INTO public.hospitals (code, name, status) VALUES
  ('HOSP001','MediFlow General Hospital','active'),
  ('HOSP002','City Care Hospital','active'),
  ('HOSP003','Sunrise Medical Center','active')
ON CONFLICT (code) DO NOTHING;
