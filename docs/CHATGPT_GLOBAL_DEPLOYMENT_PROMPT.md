# Copy-Paste Prompt For Global MediFlow Deployment Guidance

Paste this into ChatGPT when you are ready to deploy MediFlow globally:

```text
You are my senior cloud security, Supabase, Vercel/TanStack Start, and healthcare SaaS deployment advisor.

I am deploying MediFlow Clinical, a multi-hospital workflow platform. The repository is a TanStack Start React app using Supabase Auth and Postgres. It has these roles:

- super_admin
- hospital_admin
- doctor
- compounder
- lab
- pharmacist
- records_viewer

The app supports:

- email/password login,
- registered mobile OTP login,
- registered mobile OTP password reset,
- staff registration with mobile OTP verification,
- platform super admin hospital creation/activation,
- hospital admin staff approval/suspension,
- hospital-specific access codes.

My requirements:

1. Publish globally on a real domain with HTTPS.
2. Support at least 500 concurrent users.
3. Support many hospitals on one platform.
4. Prevent one hospital from seeing another hospital's users or patient data.
5. Prevent data leakage from frontend keys, browser storage, bad RLS, logs, files, or admin mistakes.
6. Configure Supabase phone OTP with a production SMS provider.
7. Bootstrap the first super admin securely.
8. Submit the site to Google Search Console so "MediFlow" can be discovered.
9. Prepare for real healthcare data with audit logs, backups, monitoring, and compliance review.

Guide me step by step. For every step, give:

- exact dashboard location,
- exact command or SQL if needed,
- what value to paste where,
- how to verify it worked,
- what mistake could cause a security breach,
- how to roll back safely.

Important repository files:

- docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md
- supabase/migrations/20260607000000_production_tenant_security.sql
- src/lib/mediflow-store.ts
- src/routes/access.tsx
- src/routes/staff-requests.tsx
- src/server.ts
- public/robots.txt
- public/sitemap.xml
- .env.example

Do not assume the app is safe for real patient data until all clinical workflow data is moved from browser/localStorage helpers into Supabase/Postgres tables with Row Level Security. Help me design and verify those tables before go-live.
```
