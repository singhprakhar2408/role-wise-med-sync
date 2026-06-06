export const SITE_URL =
  (import.meta.env.VITE_MEDIFLOW_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://mediflowclinical.com";

export const SITE = {
  name: "MediFlow Clinical",
  url: SITE_URL,
  description:
    "Secure, role-based hospital workflow software connecting intake, doctor consultation, laboratory reports, pharmacy dispensing, patient records, and staff approvals.",
  author: "MediFlow Clinical",
};
