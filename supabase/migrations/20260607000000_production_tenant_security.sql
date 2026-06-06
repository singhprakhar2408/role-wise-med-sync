-- MediFlow production tenant security hardening.
-- Apply after the initial schema migrations and before public launch.

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove Lovable/demo hospitals from a production launch database.
DELETE FROM public.hospitals
WHERE code IN ('HOSP001', 'HOSP002', 'HOSP003');

-- Anonymous users should not be able to list hospital tenants.
REVOKE SELECT ON public.hospitals FROM anon;
REVOKE DELETE ON public.hospitals FROM authenticated;

-- Public code verification is intentionally narrow: caller supplies one code,
-- and the function returns only the matching active hospital.
CREATE OR REPLACE FUNCTION public.lookup_active_hospital(_code TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  status public.hospital_status
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.id, h.code, h.name, h.status
  FROM public.hospitals h
  WHERE h.code = upper(trim(_code))
    AND h.status = 'active'
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.lookup_active_hospital(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_active_hospital(TEXT) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "anyone authenticated or anon can read hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "authenticated reads active hospitals" ON public.hospitals;
CREATE POLICY "authenticated reads active hospitals"
ON public.hospitals
FOR SELECT
TO authenticated
USING (status = 'active' OR public.has_role(auth.uid(), 'super_admin'));

-- Keep RLS as the final source of truth for hospital management.
DROP POLICY IF EXISTS "super_admin manages hospitals delete" ON public.hospitals;

CREATE UNIQUE INDEX IF NOT EXISTS hospitals_code_upper_unique
ON public.hospitals (upper(code));

-- GLOBAL is reserved in the frontend only for first super_admin bootstrap.
-- It must never become a normal hospital tenant.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hospitals_code_not_global'
      AND conrelid = 'public.hospitals'::regclass
  ) THEN
    ALTER TABLE public.hospitals
      ADD CONSTRAINT hospitals_code_not_global CHECK (upper(code) <> 'GLOBAL');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS hospitals_status_idx
ON public.hospitals (status);

CREATE INDEX IF NOT EXISTS profiles_hospital_status_idx
ON public.profiles (hospital_id, status);

CREATE INDEX IF NOT EXISTS profiles_hospital_role_idx
ON public.profiles (hospital_id, role);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_hospital_email_unique
ON public.profiles (hospital_id, lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_hospital_mobile_unique
ON public.profiles (hospital_id, mobile)
WHERE mobile IS NOT NULL AND mobile <> '';

-- Prevent users or hospital admins from editing protected tenant/role fields
-- through a modified browser client. Super admins remain the only role allowed
-- to move users across roles/tenants.
CREATE OR REPLACE FUNCTION public.protect_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super BOOLEAN := public.has_role(auth.uid(), 'super_admin');
  is_hospital_admin BOOLEAN := public.has_role(auth.uid(), 'hospital_admin');
BEGIN
  IF is_super THEN
    RETURN NEW;
  END IF;

  IF NEW.id <> OLD.id
    OR NEW.hospital_id IS DISTINCT FROM OLD.hospital_id
    OR NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Protected profile fields cannot be changed';
  END IF;

  IF NOT is_hospital_admin AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Profile status can only be changed by an administrator';
  END IF;

  IF is_hospital_admin AND OLD.hospital_id IS DISTINCT FROM public.current_hospital_id() THEN
    RAISE EXCEPTION 'Cannot manage staff outside your hospital';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_before_update_protect ON public.profiles;
CREATE TRIGGER profiles_before_update_protect
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_update();

REVOKE EXECUTE ON FUNCTION public.protect_profile_update() FROM PUBLIC, anon, authenticated;
