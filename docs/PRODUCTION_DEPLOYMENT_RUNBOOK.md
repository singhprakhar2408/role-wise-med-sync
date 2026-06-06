# MediFlow Production Deployment Runbook

This runbook is for launching MediFlow as a multi-hospital platform with strong tenant isolation.

## 1. Non-Negotiable Launch Gate

Do not accept real patient data until every clinical workflow table is server-backed with Supabase/Postgres Row Level Security. The current app has production auth, hospital verification, staff approval, mobile OTP login, and password reset flows, but the queue/lab/prescription helpers still include local browser persistence and must be moved to protected database tables before clinical use.

Use the current build for a controlled pilot, admin verification workflow, and UI validation only. Use the database/RLS architecture below before live medical operations.

## 2. Recommended Production Architecture

- Frontend/server: Vercel, Netlify, Cloudflare Pages, or another HTTPS host that supports the TanStack Start/Nitro build.
- Database/auth: Supabase Postgres with Row Level Security enabled on every tenant table.
- OTP: Supabase Auth phone provider connected to a production SMS provider.
- Region: choose the closest Supabase region to the primary hospitals.
- Scale target: start with Supabase Pro/Team, connection pooling enabled, and CDN-hosted frontend. This is sufficient for a 500 concurrent user launch if database queries are indexed and clinical payloads stay small.
- Monitoring: Sentry or equivalent frontend/server error tracking, Supabase logs, uptime monitor, and alerting for auth failures/error spikes.

## 3. Apply Database Migrations

Run every migration in `supabase/migrations` in order, especially:

- `20260607000000_production_tenant_security.sql`

That migration:

- removes demo hospitals,
- prevents anonymous hospital listing,
- adds the `lookup_active_hospital` RPC,
- adds tenant indexes and unique constraints,
- prevents non-super-admin clients from changing protected profile fields,
- keeps hospital staff isolated by `hospital_id`.

## 4. Bootstrap The First Platform Admin

1. Create a user in Supabase Auth using the production admin email and mobile number.
2. Copy that Auth user UUID.
3. Run this SQL in the Supabase SQL editor:

```sql
insert into public.profiles (
  id,
  hospital_id,
  full_name,
  email,
  mobile,
  role,
  department,
  status
) values (
  'PASTE_AUTH_USER_UUID',
  null,
  'Platform Admin',
  'admin@yourdomain.com',
  '+919876543210',
  'super_admin',
  'Platform Security',
  'approved'
)
on conflict (id) do update set
  role = 'super_admin',
  status = 'approved',
  hospital_id = null;
```

4. Sign in at `/access` with hospital code `GLOBAL`.
5. Open `Admin Operations`.
6. Create each hospital only after legal/physical verification.
7. Ask each hospital admin to register as staff for their hospital code.
8. Super admin approves that account and changes its role to `Hospital Admin`.

## 5. Hospital Isolation Rules

- Every hospital has one `hospitals.id`.
- Every staff profile has exactly one `profiles.hospital_id`, except `super_admin`.
- Hospital admins can approve/suspend staff only inside their hospital.
- Staff login checks both status and hospital match.
- Clinical tables must include `hospital_id` and RLS policies using `public.current_hospital_id()`.
- Platform super admins should verify tenants and staff roles, not browse patient data unless you intentionally build an audited break-glass workflow.

## 6. Mobile OTP And Password Reset

Enable phone auth in Supabase Auth settings and connect a real SMS provider. Then test:

- existing staff login with email/password,
- existing staff login with registered mobile OTP,
- new staff registration with mobile OTP,
- password reset with registered mobile OTP,
- suspended/rejected/pending accounts cannot sign in.

## 7. Environment Variables

Set these in the host dashboard:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For this production shell/demo, do not configure server secrets in the frontend app.

## 8. 500 Concurrent User Readiness

- Use indexed queries only.
- Enable Supabase connection pooling.
- Move clinical lists to paginated queries.
- Use Supabase Realtime channels per hospital, not one global channel.
- Keep file uploads in Supabase Storage with hospital-scoped paths and signed URLs.
- Add rate limiting for OTP, login, registration, and admin actions.
- Load test with at least 500 concurrent virtual users before go-live.

## 9. Google Discovery

After deployment:

- point the real domain DNS to the host,
- update `public/sitemap.xml` and `public/robots.txt` to the real domain,
- verify the domain in Google Search Console,
- submit the sitemap,
- keep the homepage crawlable and avoid blocking `/` in robots.txt.

Google indexing and ranking are never instant or guaranteed.

## 10. Final Security Checklist

- All demo data removed.
- Supabase RLS enabled on every table.
- No service key in frontend code.
- SMS OTP provider enabled.
- Strong password policy tested.
- MFA considered for platform admins.
- Hospital admin cannot update another hospital.
- Audit log records admin approvals, role changes, suspensions, password resets, and hospital status changes.
- Backups and restore drills are configured.
- Legal/compliance review completed for the launch country.
