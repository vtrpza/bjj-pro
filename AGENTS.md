# AGENTS.md

## Project Context

This repository is for a BJJ-only academy management product. The current `ProjectBJJGYM.html` file is a self-contained HTML prototype and should be treated as the product reference, not production architecture.

Approved MVP direction:

- Build a mobile-first PWA for Brazilian Jiu-Jitsu academies.
- Use React + Vite + TypeScript for the frontend.
- Use Supabase for auth, Postgres, RLS, storage, and edge functions.
- Use Asaas API for Pix-only mensalidade payments in the first MVP.
- Use QR-code self check-in for BJJ training sessions.
- Graduation progress is attendance-informed, but all grau/faixa promotions remain manually approved by academy admins.
- Launch for one pilot academy first, while keeping the schema multi-academy-ready.

## Current Implementation State

The repo has moved beyond the prototype stage. `ProjectBJJGYM.html` is still the product/design reference, but production work now lives in a React/Vite/Supabase scaffold.

Implemented foundation:

- `pnpm` React + Vite + TypeScript PWA scaffold at repo root.
- `vite-plugin-pwa` configured with a minimal manifest/service worker setup.
- Vercel config in `vercel.json` with `pnpm build` and `dist` output.
- Feature-oriented frontend structure under `src/`.
- TanStack Query, React Hook Form, Zod, and Vitest are installed and in use.
- Supabase client lives in `src/shared/lib/supabase.ts`.
- Browser auth is configured with `persistSession: false`; do not add `localStorage` auth persistence without an explicit security decision.

Implemented frontend areas:

- `/login` and `/login/reset` screens using Supabase auth when env vars are configured.
- Role-guarded `/admin` and `/aluno` route shells.
- Admin dashboard reading Supabase metrics from `students`, `payments`, and `checkins`.
- Admin student CRUD UI backed by Supabase `students` and `bjj_belts`.
- Admin academy settings form backed by `academies`.
- Student home backed by linked `students`, `payments`, `checkins`, and `graduation_rules` data.
- Student profile page with safe editable `profiles.full_name` and `profiles.phone` only; BJJ progression fields are read-only.
- Admin QR generation/display UI for BJJ training sessions.
- Student QR camera scanning UI using a JS decoder fallback plus manual-code check-in fallback.

Implemented Supabase areas:

- Initial migration: `supabase/migrations/20260424000100_bjj_mvp_foundation.sql`.
- Core tables exist: `academies`, `profiles`, `academy_members`, `students`, `bjj_belts`, `training_sessions`, `checkins`, `payments`, `asaas_customers`, `asaas_payment_events`, `expenses`, `graduation_rules`, `audit_logs`.
- RLS baseline is enabled from the initial migration.
- Authenticated clients cannot write `asaas_payment_events` or `audit_logs`.
- Authenticated clients cannot directly create check-ins; trusted Edge Function flow owns check-in creation.
- Authenticated admins cannot write QR token fields directly on `training_sessions`; the QR Edge Function owns token generation.
- `supabase/seed.sql` seeds a pilot academy, BJJ adult/kids belt paths, and pilot graduation-rule defaults.
- `supabase/pilot-bootstrap.example.sql` documents optional pilot profile/member/student bootstrap after a real auth user exists.

Implemented Edge Functions:

- Shared utilities under `supabase/functions/_shared/` for CORS, JSON responses, env validation, service-role Supabase client, auth extraction, and QR helpers.
- `supabase/functions/qr-session-token`: owner/admin creates or opens the current treino and receives a short-lived signed QR token plus uppercase manual code.
- `supabase/functions/checkin-validate`: authenticated student validates QR/manual code; backend checks expiry, academy/session/student match, open session, and duplicate status before inserting a check-in.

Current verification status:

- `pnpm typecheck` passes.
- `pnpm lint` passes.
- `pnpm test` passes with 22 tests.
- `pnpm build` passes, with a non-blocking Vite chunk-size warning.
- `pnpm dlx supabase db reset` passes locally.
- Deno is not installed in this environment, so Edge Functions have not been typechecked with `deno check` here.

Required environment variables and secrets:

- Browser/Vite: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Supabase Edge Functions: `QR_TOKEN_SECRET`.
- Supabase runtime provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; never expose these through `VITE_` variables.

Known remaining MVP work:

- Asaas Pix backend and UI: customer creation/linking, Pix cobranca creation/reuse, idempotent webhook processing, payment status updates, due-date renewal, Pix QR/copy-paste display.
- Graduation manual promotion workflow and promotion audit logs.
- Check-in correction/review audit workflow.
- PWA install/update polish and mobile pilot QA.
- Vercel deployment verification and production Supabase/Edge Function secret setup.

## Product Boundaries

This is not a generic gym, fitness studio, or martial arts platform. Keep scope BJJ-specific.

Use BJJ terminology:

- Academia de Jiu-Jitsu
- Aluno
- Treino
- Check-in no treino
- Mensalidade
- Faixa
- Grau
- Graduação

Avoid generic or out-of-scope terms in MVP UI and domain code:

- MMA
- Muay Thai
- Boxe
- Modalidade, unless there is a concrete BJJ-specific class-type need later
- Fitness/studio/gym management language

## MVP Scope

Academy admin MVP:

- Dashboard with active students, overdue mensalidades, today's check-ins, Pix payment state, and monthly revenue.
- Student CRUD with BJJ-specific fields.
- QR training-session generation.
- Attendance/check-in review and correction.
- Asaas Pix payment status visibility.
- Graduation progress and manual promotion.
- Academy settings and branding.

Student MVP:

- Home screen with mensalidade status, faixa/grau, progress, and check-in CTA.
- QR scanner check-in flow.
- Mensalidade Pix payment screen.
- Payment history/status.
- Graduation progress.
- Profile screen.

Out of scope for MVP:

- Native iOS/Android store apps.
- Card payments.
- Boleto.
- Pix Automático.
- Asaas subscriptions.
- Payment split/subaccounts.
- Refund and chargeback UI.
- Full offline write sync.
- WhatsApp automation.
- Fully automatic belt promotion.

## Architecture Heuristics

- Prefer the smallest correct implementation that preserves future multi-academy support.
- Do not carry over the prototype's single-file/localStorage architecture into production.
- Keep frontend state client-side only for UI concerns; Supabase/Postgres is the source of truth.
- Put trusted operations in Supabase Edge Functions or server-side code, especially Asaas and QR validation.
- Never expose Asaas secret keys to the browser.
- Never let the client mark a payment as paid.
- Payment status must be updated only from trusted Asaas webhook processing.
- Make webhooks idempotent before adding user-facing payment flows.
- Use Row Level Security from the beginning; do not postpone access control.
- Keep audit logs for sensitive admin actions: payment updates, student deletion/deactivation, check-in correction, and grau/faixa promotion.

## Suggested Frontend Structure

Use a feature-oriented structure once the PWA is scaffolded:

```text
src/
  app/
    router/
    providers/
    layouts/
  features/
    auth/
    academy/
    students/
    checkins/
    payments/
    graduation/
    settings/
    student-home/
  shared/
    components/
    hooks/
    lib/
    styles/
    types/
```

Recommended frontend libraries:

- React + Vite + TypeScript.
- TanStack Query for server state.
- React Hook Form + Zod for forms and validation.
- Tailwind/shadcn or a small custom component system derived from the HTML prototype.
- vite-plugin-pwa for PWA manifest/service worker behavior.

## Suggested Data Model

Expected core tables:

- `academies`
- `profiles`
- `academy_members`
- `students`
- `bjj_belts`
- `training_sessions`
- `checkins`
- `payments`
- `asaas_customers`
- `asaas_payment_events`
- `expenses`
- `graduation_rules`
- `audit_logs`

Schema rules:

- Every academy-owned table should include `academy_id` unless it is global reference data.
- Use UUID primary keys.
- Include `created_at` and `updated_at` where practical.
- Add `created_by` or audit records for admin actions.
- Keep Asaas external IDs in dedicated fields; do not overload local IDs.

## BJJ Graduation Rules

Adult belt path:

- Branca
- Azul
- Roxa
- Marrom
- Preta
- Coral
- Vermelha

Kids belt path:

- Branca
- Cinza
- Amarela
- Laranja
- Verde

Implementation rules:

- Attendance/check-ins may calculate progress toward the next grau.
- The app may show readiness indicators.
- The academy admin must manually approve grau/faixa promotion.
- Promotions should be audit logged.
- Do not encode irreversible assumptions about official federation promotion rules in the MVP. Keep academy-level configuration possible.

## QR Check-In Rules

Use training-session QR codes, not permanent student QR codes.

Flow:

- Admin creates or opens a current BJJ training session.
- App displays a QR code containing a short-lived signed token or session code.
- Student scans the QR from the PWA.
- Backend validates academy, session, token, expiry, student identity, and duplicate status.
- Backend creates the check-in only after validation.

Security/UX rules:

- QR tokens must expire.
- One check-in per student per training session.
- Duplicate check-ins must be blocked server-side.
- Camera access requires HTTPS.
- Do not rely only on the browser `BarcodeDetector` API; it has limited support. Use a JS QR scanner fallback.
- Provide a manual fallback code path for camera failures.

## Asaas Pix Rules

Use Pix only for MVP.

Payment flow:

- Create or link an Asaas customer for each student.
- Create or reuse an open Pix cobranca for the current mensalidade.
- Display Pix QR/copy-paste code to the student.
- Process Asaas webhooks in a trusted backend endpoint.
- Store raw webhook events for idempotency/debugging.
- Mark payment as paid only after confirmed Asaas webhook event.
- Renew the student's due date only once per confirmed payment.

Avoid for MVP:

- Direct card entry in the app.
- Client-side payment confirmation.
- Manual override as the normal payment path.
- Subscription/Pix Automático unless a future approved scope requires it.

## PWA Rules

- The app should be mobile-first but remain comfortable for desktop academy admin usage.
- PWA should be installable on Android and iOS home screen.
- Cache the app shell, not sensitive or stale business data by default.
- Do not implement offline writes in MVP.
- Add clear install guidance for iOS if needed.
- Add update prompt behavior so deployed changes are visible to users.

## Linear Project

Linear team: `BJJ App`

Project: `BJJ App MVP`

Project URL: https://linear.app/escaly-content-engine/project/bjj-app-mvp-c1e3047e12d6

Start with:

- `BJJ-16` Scaffold React Vite TypeScript PWA.
- `BJJ-10` Design Supabase schema for BJJ MVP.

Phase containers:

- `BJJ-5` Phase 1: Foundation
- `BJJ-3` Phase 2: Database & Security
- `BJJ-1` Phase 3: Academy Core
- `BJJ-2` Phase 4: QR Check-In
- `BJJ-4` Phase 5: Asaas Pix
- `BJJ-6` Phase 6: Graduation
- `BJJ-7` Phase 7: PWA Polish & Pilot

Current remaining execution issues:

- `BJJ-28` Build check-in correction and review workflow.
- `BJJ-30` Implement Asaas customer and Pix cobranca flow.
- `BJJ-33` Implement idempotent Asaas webhook processing.
- `BJJ-29` Display Pix QR, copy-paste code, and payment history.
- `BJJ-27` Build manual grau and faixa promotion workflow.
- `BJJ-31` Polish PWA install, update prompt, and mobile pilot QA.
- `BJJ-32` Verify Vercel deployment and production Supabase secrets.

Linear tracking rules:

- Before starting a non-trivial change, identify the matching Linear issue and move it to `In Progress` if work begins.
- If no Linear issue exists for the discovered work, create a focused child issue under the correct phase container before or during implementation.
- When exit criteria are met, move the issue to `Done` and add a Linear comment with the commit hash, verification commands, and any known caveats.
- Keep parent phase issues aligned with child issue reality; do not leave a phase in Backlog when its child work is actively underway or complete.
- After changing MVP scope, implementation status, or remaining work, update this `AGENTS.md` file in the same branch or commit.
- Do not mark Asaas payment, QR security, graduation promotion, or PWA pilot work Done without trusted backend/security verification evidence.

## Implementation Discipline

- Before editing, inspect the existing code and preserve user changes.
- Prefer small, reviewable changes tied to one Linear issue.
- Keep business rules in named functions/modules; avoid burying them in UI components.
- Add validation close to boundaries: forms, edge functions, webhook handlers, and database constraints.
- Use Portuguese UI copy for product-facing text unless explicitly asked otherwise.
- Use English for code identifiers unless there is a strong domain reason to keep a Portuguese term, such as `mensalidade` or `grau`.
- Add tests around domain rules before or alongside implementation when feasible.
- Prioritize security for RLS, webhooks, QR tokens, and payment status.

## MVP Acceptance Criteria

The MVP is ready for pilot when:

- Admin can create and manage BJJ students.
- Admin can generate a short-lived QR for a training session.
- Student can scan QR and check in.
- Duplicate check-ins are blocked.
- Student can pay mensalidade via Asaas Pix.
- Payment status changes only after Asaas webhook confirmation.
- Due date updates after confirmed payment.
- Admin can see overdue students and monthly revenue.
- Graduation progress updates from validated check-ins.
- Admin manually controls grau/faixa promotion.
- PWA installs and works well on mobile.
