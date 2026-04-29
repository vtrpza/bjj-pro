# AGENTS.md

## Project Context

BJJ-only academy management PWA. `ProjectBJJGYM.html` is the product/design reference only, not production architecture.

**Stack:** React + Vite + TypeScript, Supabase (auth, Postgres, RLS, edge functions), Asaas Pix (payments), Vercel (deploy).

**Scope:** Mobile-first PWA for Brazilian Jiu-Jitsu academies. QR-code training check-ins. Pix-only mensalidades via Asaas. Manual grau/faixa promotions. Multi-academy schema, single pilot launch.

## Developer Commands

```bash
pnpm install          # install deps
pnpm dev              # start Vite dev server
pnpm typecheck        # tsc -b
pnpm lint             # eslint .
pnpm test             # vitest run (22 tests, jsdom env)
pnpm build            # tsc -b && vite build
pnpm preview          # vite preview
```

**Supabase local:**
```bash
pnpm dlx supabase start
pnpm dlx supabase db reset   # runs migrations + seed.sql
```

**Verification order:** `typecheck -> lint -> test -> build`

## Current Implementation State

**Frontend (`src/`):**
- Feature-oriented: `app/` (router, layouts, providers), `features/` (academy, auth, checkins, graduation, payments, settings, student-home, students), `shared/` (components, domain, lib, styles)
- Supabase client: `src/shared/lib/supabase.ts` with `persistSession: false` — do not add localStorage auth persistence without explicit security decision
- TanStack Query, React Hook Form + Zod, jsqr (QR fallback), qrcode.react, vite-plugin-pwa
- Routes: `/login`, `/login/reset`, role-guarded `/admin` and `/aluno`
- Admin: dashboard (metrics), student CRUD, academy settings (branding + checkins-per-grau), QR generation/display, check-in review/correction, payment oversight (filterable by status), graduation management (readiness indicators + manual promotion)
- Student: home (mensalidade status, faixa/grau, progress with belt color, quick actions), profile (editable `full_name`/`phone` with BR mask), QR scanner with visual overlay + manual fallback, Pix payment screen (QR + copia-e-cola + history), graduation progress view, PWA install/update prompts

**Supabase (`supabase/`):**
- Migrations: `20260424000100_bjj_mvp_foundation.sql`, `20260425000100_add_academy_checkins_per_grau.sql`, `20260428000100_checkin_correction_support.sql`, `20260428000200_asaas_webhook_support.sql`
- Tables: `academies`, `profiles`, `academy_members`, `students`, `bjj_belts`, `training_sessions`, `checkins`, `payments`, `asaas_customers`, `asaas_payment_events`, `expenses`, `graduation_rules`, `audit_logs`
- RLS enabled; clients cannot write `asaas_payment_events`, `audit_logs`, or create check-ins directly
- Admins cannot write QR token fields on `training_sessions`; Edge Functions own token generation
- Check-in correction uses partial unique index (`where status = 'valid'`) so cancelled check-ins don't block re-check-ins
- Seed: `supabase/seed.sql` (pilot academy, BJJ belt paths, graduation defaults)
- Bootstrap example: `supabase/pilot-bootstrap.example.sql`
- Production setup: `supabase/production-setup.sql`

**Edge Functions (`supabase/functions/`):**
- Shared: `_shared/` (CORS, JSON responses, env validation, service-role client, auth extraction, QR helpers with HMAC-SHA256)
- `qr-session-token`: owner/admin creates/opens current treino, returns short-lived signed QR token + uppercase manual code
- `checkin-validate`: authenticated student validates QR/manual code; backend checks expiry, academy/session/student match, open session, duplicate; inserts check-in + audit log; returns structured error codes
- `checkin-correct`: admin-only check-in correction with required reason; updates status to 'cancelled' + audit log
- `asaas-pix-create`: creates/links Asaas customer, creates/reuses Pix cobrança, returns QR payload + copy-paste text
- `asaas-webhook`: idempotent webhook processing; stores raw events; updates payment status + renews due date on confirmation
- `graduation-promote`: admin-only grau/faixa promotion with belt path validation + audit log
- **Deno is not installed locally** — edge functions cannot be typechecked with `deno check` here

**PWA:**
- `vite-plugin-pwa` with `registerType: 'prompt'` for update notifications
- Service worker: app shell precached, Supabase REST API uses NetworkFirst (60s), auth endpoints use NetworkOnly
- Install prompt: detects `beforeinstallprompt` (Android) + iOS Safari manual instructions
- Update prompt: "Nova versão disponível" toast with "Atualizar" button
- Icons: `public/icons/icon-192.png`, `public/icons/icon-512.png` (placeholder "JJ" — replace before pilot)
- Mobile QA checklist: `MOBILE_QA.md`

## Environment Variables

- **Browser/Vite:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (copy `.env.example` to `.env.local`)
- **Edge Functions:** `QR_TOKEN_SECRET`, `ASAAS_API_KEY`, `ASAAS_API_URL`, `ASAAS_WEBHOOK_TOKEN`
- **Supabase runtime:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — never expose via `VITE_` variables
- **Never commit:** Asaas secret keys, service role keys, QR_TOKEN_SECRET, ASAAS_WEBHOOK_TOKEN

## Product Boundaries

**Use BJJ terminology:** Academia de Jiu-Jitsu, Aluno, Treino, Check-in no treino, Mensalidade, Faixa, Grau, Graduação

**Avoid:** MMA, Muay Thai, Boxe, Modalidade, fitness/studio/gym language

**Out of scope for MVP:** Native apps, card/boleto/Pix Automático, Asaas subscriptions, payment split, refunds/chargebacks, offline write sync, WhatsApp automation, automatic belt promotion

## Architecture Heuristics

- Smallest correct implementation preserving multi-academy support
- Supabase/Postgres is source of truth; client state is UI-only
- Trusted operations in Edge Functions: Asaas, QR validation, check-in creation, payment status
- Never expose Asaas secrets to browser; never let client mark payment as paid
- Payment status updated only from trusted Asaas webhook; make webhooks idempotent
- RLS from the start; audit logs for sensitive actions (payment updates, student deletion, check-in correction, promotions)
- Portuguese UI copy; English code identifiers (except domain terms like `mensalidade`, `grau`)

## BJJ Graduation Rules

**Adult:** Branca → Azul → Roxa → Marrom → Preta → Coral → Vermelha
**Kids:** Branca → Cinza → Amarela → Laranja → Verde

Check-ins calculate progress toward next grau. Admin must manually approve all promotions. Promotions are audit logged. Do not encode irreversible federation promotion rules.

## QR Check-In Rules

Training-session QR codes (not permanent student QRs). Admin generates short-lived signed token. Student scans via PWA. Backend validates academy, session, token, expiry, identity, duplicate. One check-in per student per session. Camera requires HTTPS. JS QR decoder fallback + manual code entry required.

## Asaas Pix Rules

Create/link Asaas customer per student. Create/reuse open Pix cobrança. Display QR/copy-paste. Process webhooks in trusted backend. Store raw events for idempotency. Mark paid only after confirmed webhook. Renew due date once per confirmed payment.

## Linear Project

**Team:** `BJJ App` | **Project:** [BJJ App MVP](https://linear.app/escaly-content-engine/project/bjj-app-mvp-c1e3047e12d6)

**All issues complete:** ✅ Phases 1-7 done (21 issues total, 17 completed in multi-agent execution)

**Tracking rules:**
- Move issue to `In Progress` before starting work
- Create child issue under correct phase if none exists
- Mark `Done` with commit hash, verification commands, caveats
- Update this file when scope/status changes
- Do not mark payment/QR/graduation/Pilot work Done without backend/security verification

## MVP Acceptance Criteria

- Admin can create/manage BJJ students
- Admin can generate short-lived QR for training session
- Student can scan QR and check in; duplicates blocked
- Student can pay mensalidade via Asaas Pix
- Payment status changes only after Asaas webhook confirmation
- Due date updates after confirmed payment
- Admin can see overdue students and monthly revenue
- Graduation progress updates from validated check-ins
- Admin manually controls grau/faixa promotion
- PWA installs and works well on mobile
