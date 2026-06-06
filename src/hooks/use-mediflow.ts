import { useEffect, useState } from "react";
import {
  currentUser,
  fetchStaffForHospital,
  refreshCurrentProfile,
  type StaffAccount,
} from "@/lib/mediflow-store";

export function useCurrentUser(): StaffAccount | null {
  const [user, setUser] = useState<StaffAccount | null>(() => currentUser());
  useEffect(() => {
    let mounted = true;
    refreshCurrentProfile().then((u) => mounted && setUser(u));
    return () => {
      mounted = false;
    };
  }, []);
  return user;
}

export function useHospitalStaff(hospitalId: string | null | undefined): {
  staff: StaffAccount[];
  loading: boolean;
  reload: () => void;
} {
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!hospitalId) {
      setStaff([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchStaffForHospital(hospitalId)
      .then((rows) => !cancelled && setStaff(rows))
      .catch(() => !cancelled && setStaff([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [hospitalId, tick]);
  return { staff, loading, reload: () => setTick((n) => n + 1) };
}
