# BJJ App MVP — Multi-Agent Construction Plan

**Created:** 2026-04-28  
**Target:** Complete all remaining backlog issues for pilot launch  
**Deadline:** 2026-05-31 (per Linear project)

---

## Current State

| Phase | Status | Issues |
|-------|--------|--------|
| Phase 1: Foundation | ✅ Done | BJJ-5, BJJ-8, BJJ-9, BJJ-16 |
| Phase 2: Database & Security | ✅ Done | BJJ-3, BJJ-10, BJJ-11, BJJ-13 |
| Phase 3: Academy Core | ✅ Done | BJJ-1, BJJ-14, BJJ-15 |
| Phase 4: QR Check-In | 🔨 Partial | BJJ-12 done; BJJ-18, BJJ-24, BJJ-28 remaining |
| Phase 5: Asaas Pix | ❌ Not started | BJJ-23/30, BJJ-22/29, BJJ-19/33 |
| Phase 6: Graduation | ❌ Not started | BJJ-20, BJJ-27 |
| Phase 7: PWA Polish & Pilot | ❌ Not started | BJJ-17, BJJ-25, BJJ-26/31, BJJ-32, BJJ-21 |

**Duplicate issues identified:** BJJ-23 ≈ BJJ-30, BJJ-22 ⊂ BJJ-29, BJJ-19 ≈ BJJ-33. We'll implement the superset of each pair and close the narrower one.

---

## Dependency Graph

```
                    ┌──────────────────┐
                    │  BJJ-25 Student  │
                    │  Home & Profile  │
                    └────────┬─────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
    ▼                        ▼                        ▼
┌───────────┐      ┌──────────────────┐      ┌───────────────┐
│ BJJ-18    │      │ BJJ-24           │      │ BJJ-17        │
│ QR Scanner│      │ Server-side      │      │ Academy       │
│ (frontend)│      │ Check-in Validate│      │ Settings      │
└─────┬─────┘      └────────┬─────────┘      └───────┬───────┘
      │                     │                        │
      └──────────┬─────────┘                        │
                 │                                  │
                 ▼                                  │
        ┌────────────────┐                          │
        │ BJJ-28          │                          │
        │ Check-in        │                          │
        │ Correction      │                          │
        └────────┬────────┘                          │
                 │                                  │
    ┌────────────┼──────────────────────────────────┤
    │            │                                  │
    ▼            ▼                                  ▼
┌──────────┐  ┌──────────────────┐          ┌──────────────┐
│ BJJ-20   │  │ BJJ-23/30        │          │ BJJ-26/31    │
│ Graduatn │  │ Asaas Customer   │          │ PWA Install  │
│ Progress │  │ & Cobrança       │          │ & Update     │
└────┬─────┘  └────────┬─────────┘          └──────┬───────┘
     │                 │                           │
     ▼                 ▼                           │
┌──────────┐  ┌──────────────────┐                │
│ BJJ-27   │  │ BJJ-22/29        │                │
│ Manual   │  │ Pix QR Display   │                │
│ Promotion│  │ & Payment History│                │
└────┬─────┘  └────────┬─────────┘                │
     │                 │                           │
     │                 ▼                           │
     │        ┌──────────────────┐                 │
     │        │ BJJ-19/33        │                 │
     │        │ Asaas Webhook    │                 │
     │        │ Idempotency      │                 │
     │        └────────┬─────────┘                 │
     │                 │                           │
     └────────┬────────┘                           │
              │                                    │
              ▼                                    ▼
     ┌──────────────────────────────────────────────┐
     │          BJJ-32 Vercel Deployment             │
     └──────────────────────┬───────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │ BJJ-21 Security & Pilot  │
              │ Readiness Pass           │
              └──────────────────────────┘
```

---

## Multi-Agent Execution Plan

### Wave 1 — Parallel Foundation (3 agents simultaneously)

These three workstreams share **zero file overlap** and can run in complete isolation.

---

#### Agent A: QR Check-In Frontend (BJJ-18)

**Linear:** BJJ-18 — Build student QR scanner check-in flow  
**Model:** qwen3.6-plus (balanced cost/quality for UI work)  
**Branch:** `feat/bjj-18-qr-scanner`

**Context Brief:**
- Stack: React + Vite + TypeScript, TanStack Query, jsqr (already in deps), qrcode.react
- Existing: `src/features/checkins/StudentCheckinPage.tsx` (shell), `src/features/checkins/CheckinsPage.tsx` (admin view)
- Edge function `checkin-validate` already exists at `supabase/functions/checkin-validate/index.ts`
- Edge function `qr-session-token` already exists at `supabase/functions/qr-session-token/index.ts`
- Shared QR helpers: `supabase/functions/_shared/qr.ts`
- Client-side QR lib: `src/shared/lib/qrCheckin.ts` + test

**Task List:**
1. Build camera-based QR scanner component using `navigator.mediaDevices.getUserMedia`
2. Integrate jsqr as fallback decoder (already in package.json)
3. Add manual code entry fallback (uppercase 6-char code)
4. Wire scanner result → `POST /functions/v1/checkin-validate` with auth header
5. Handle success/duplicate/expired/error states with Portuguese UI copy
6. Handle camera permission denied and HTTPS-only camera requirement
7. Add loading/success/error toast feedback

**Verification:**
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Exit Criteria:**
- Student can scan QR code via camera or enter manual code
- Camera permission denied shows manual fallback
- Invalid/expired/duplicate responses show appropriate Portuguese messages
- Works over HTTPS (camera requirement documented)

---

#### Agent B: QR Check-In Backend Validation (BJJ-24)

**Linear:** BJJ-24 — Validate QR check-ins server-side  
**Model:** qwen3.6-plus (backend logic, well-scoped)  
**Branch:** `feat/bjj-24-checkin-validate`

**Context Brief:**
- Edge function `supabase/functions/checkin-validate/index.ts` already exists with partial implementation
- Shared modules: `_shared/qr.ts`, `_shared/supabase.ts`, `_shared/auth.ts`, `_shared/http.ts`, `_shared/validation.ts`, `_shared/env.ts`
- RLS prevents direct client check-in inserts
- Token validation uses `QR_TOKEN_SECRET` env var
- Tables: `checkins`, `training_sessions`, `students`, `academy_members`

**Task List:**
1. Verify/complete token signature validation in `checkin-validate` edge function
2. Validate: session exists, session is open, session belongs to student's academy
3. Validate: token not expired (configurable TTL, default 15 min)
4. Validate: student has active membership in the academy
5. Prevent duplicate check-in (one per student per session)
6. Insert check-in record with audit trail
7. Return structured error codes: `SESSION_NOT_FOUND`, `SESSION_CLOSED`, `TOKEN_EXPIRED`, `DUPLICATE_CHECKIN`, `NOT_MEMBER`
8. Add integration test scenarios (can be Supabase test helpers or manual curl tests)

**Verification:**
```bash
# Edge functions can't be typechecked locally (Deno), but verify shared modules
pnpm typecheck && pnpm lint
```

**Exit Criteria:**
- Invalid/expired/duplicate tokens are rejected with specific error codes
- One check-in per student per training session enforced
- Check-in record created only after full validation
- Audit log entry created for each check-in

---

#### Agent C: Student Home & Profile + Academy Settings (BJJ-25, BJJ-17)

**Linear:** BJJ-25 + BJJ-17  
**Model:** qwen3.6-plus (UI-heavy, well-defined scope)  
**Branch:** `feat/bjj-25-student-home-profile`

**Context Brief:**
- Existing shells: `src/features/student-home/StudentHomePage.tsx`, `src/features/student-home/StudentProfilePage.tsx`, `src/features/settings/SettingsPage.tsx`
- Existing queries: `src/shared/lib/studentQueries.ts`, `src/shared/lib/academyQueries.ts`
- Existing domain: `src/shared/domain/studentSummary.ts`, `src/shared/domain/academy.ts`
- Supabase client: `src/shared/lib/supabase.ts`
- Tables: `students`, `academies`, `profiles`, `bjj_belts`, `payments`, `checkins`

**Task List:**

**BJJ-25 — Student Home & Profile:**
1. Build student home: faixa/grau display, mensalidade status badge, check-in CTA button, progress summary
2. Build student profile: editable `full_name` and `phone` only; read-only BJJ progression fields
3. Wire to Supabase queries with TanStack Query
4. Add empty/loading/error states using `StateViews.tsx`

**BJJ-17 — Academy Settings:**
1. Build settings form: academy name, logo URL, primary color, contact info, attendance-per-grau rule
2. Persist to `academies` table via admin-only update
3. Apply primary color to app shell (CSS variable or theme token)
4. Add validation with Zod schema

**Verification:**
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Exit Criteria:**
- Student home shows faixa/grau, mensalidade status, check-in CTA, progress
- Student profile allows editing name/phone only
- Academy settings persist and affect app shell branding
- All screens have empty/loading/error states

---

### Wave 2 — Check-In Correction + Asaas Backend (2 agents)

Wave 2 starts after Wave 1 completes. BJJ-28 depends on BJJ-18 + BJJ-24. Asaas backend is independent.

---

#### Agent D: Check-In Correction & Review (BJJ-28)

**Linear:** BJJ-28 — Build check-in correction and review workflow  
**Model:** glm-5.1 (audit logging + security-sensitive path)  
**Branch:** `feat/bjj-28-checkin-correction`

**Context Brief:**
- Depends on: BJJ-18 (scanner) + BJJ-24 (validation) being complete
- Admin feature: review check-ins per training session, correct/remove incorrect ones
- Must use trusted path (edge function or admin-only RPC)
- Corrections must be audit logged
- Tables: `checkins`, `training_sessions`, `audit_logs`
- RLS: admin-only write access to check-in corrections

**Task List:**
1. Build admin check-in review view: list check-ins for a selected training session
2. Add "remove check-in" action with confirmation dialog (Portuguese)
3. Create edge function `checkin-correct` or Supabase RPC for admin correction
4. Write audit log entry on every correction (who, what, when, why)
5. Ensure student duplicate prevention remains intact after correction
6. Add reason field for correction (required)

**Verification:**
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Exit Criteria:**
- Admin can review all check-ins for a training session
- Admin can correct/remove an incorrect check-in through trusted path
- Every correction is audit logged with reason
- Student duplicate prevention still works after correction

---

#### Agent E: Asaas Customer & Cobrança Flow (BJJ-23/30)

**Linear:** BJJ-23 + BJJ-30 — Create/link Asaas customer and Pix cobrança  
**Model:** glm-5.1 (payment integration, security-critical)  
**Branch:** `feat/bjj-23-asaas-pix-flow`

**Context Brief:**
- Asaas API v3: https://docs.asaas.com/
- Pix-only mensalidades (no card, no boleto, no Pix Automático for MVP)
- Tables: `asaas_customers`, `payments`, `students`
- Edge functions: new `asaas-pix-create` function needed
- Asaas secrets MUST stay server-side (never in VITE_ vars)
- Environment: `ASAAS_API_KEY` in Supabase secrets, `ASAAS_API_URL` (sandbox vs production)

**Task List:**
1. Create `supabase/functions/asaas-pix-create/index.ts` edge function
2. Implement Asaas customer creation/linking:
   - Check if `asaas_customers` record exists for student
   - If not, create Asaas customer via API (name, email, cpfCnpj)
   - Store `asaas_customer_id` in `asaas_customers` table
3. Implement Pix cobrança creation:
   - Check for existing open cobrança for the student's current mensalidade
   - If exists, return existing Pix data (reuse, don't duplicate)
   - If not, create new cobrança via Asaas API (billingType=PIX, value, dueDate)
   - Store payment record with `asaas_payment_id` in `payments` table
4. Return Pix QR code payload and copy-paste text to client
5. Add error handling for Asaas API failures (rate limits, validation errors)
6. Add request validation (authenticated student, active membership)

**Verification:**
```bash
pnpm typecheck && pnpm lint
# Manual: test with Asaas sandbox API
```

**Exit Criteria:**
- Asaas secret never exposed to browser
- Student can request current open Pix mensalidade
- Existing open cobrança is reused instead of duplicated
- Local payment records store Asaas IDs in dedicated fields
- Edge function validates auth and membership before creating cobrança

---

### Wave 3 — Asaas Frontend + Webhook + Graduation (3 agents)

Wave 3 starts after Wave 2 completes. Asaas frontend depends on Agent E. Webhook is independent but logically follows. Graduation depends on check-ins being complete.

---

#### Agent F: Pix QR Display & Payment History (BJJ-22/29)

**Linear:** BJJ-22 + BJJ-29 — Display Pix QR, copy-paste, payment history  
**Model:** qwen3.6-plus (UI work)  
**Branch:** `feat/bjj-22-pix-display`

**Context Brief:**
- Depends on: BJJ-23/30 (Asaas backend) being complete
- Existing: `src/features/payments/PaymentsPage.tsx` (shell)
- Student sees: Pix QR code image, copy-paste "copia e cola" text, payment status
- Admin sees: pending/confirmed/overdue payment list
- qrcode.react already in deps for QR rendering
- Portuguese UI copy: "Mensalidade", "Pix", "Vencimento", "Pago", "Pendente", "Vencida"

**Task List:**
1. Build student mensalidade screen:
   - Current payment status badge (pago/pendente/vencida)
   - Pix QR code rendered from `pixPayload` returned by edge function
   - Copy-paste "copia e cola" button with clipboard API
   - Payment history list (date, value, status)
2. Build admin payment view:
   - Filterable list of payments by status (pending/confirmed/overdue)
   - Student name, due date, value, status
   - Link to student detail
3. Wire to TanStack Query with polling for payment status updates
4. Never mark payment as paid locally — status comes from webhook only
5. Add empty/loading/error states

**Verification:**
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Exit Criteria:**
- Student sees Pix QR/copia-e-cola for current mensalidade
- Student sees payment status/history from trusted records
- Admin can see pending/confirmed/overdue Pix state
- UI uses BJJ/Pix mensalidade terminology in Portuguese
- Payment status never updated client-side

---

#### Agent G: Asaas Webhook Idempotency (BJJ-19/33)

**Linear:** BJJ-19 + BJJ-33 — Implement idempotent Asaas webhook processing  
**Model:** glm-5.1 (payment security, idempotency-critical)  
**Branch:** `feat/bjj-19-asaas-webhook`

**Context Brief:**
- Asaas webhook documentation: https://docs.asaas.com/
- Tables: `asaas_payment_events`, `payments`
- `asaas_payment_events` stores raw webhook payloads for idempotency/debugging
- RLS prevents client writes to `asaas_payment_events` and `payments.status`
- Webhook events: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, etc.
- Must be idempotent: duplicate webhook deliveries must not double-renew due dates

**Task List:**
1. Create `supabase/functions/asaas-webhook/index.ts` edge function
2. Implement webhook signature verification (Asaas uses `asaas-access-token` header or HMAC)
3. Store raw event in `asaas_payment_events` table (idempotency key = event ID from Asaas)
4. Process event based on type:
   - `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED`: mark payment as paid, renew due date
   - `PAYMENT_OVERDUE`: mark payment as overdue
   - Other events: log but don't process
5. Idempotency: check if event already processed before applying state changes
6. Due date renewal: only once per confirmed payment (use payment ID as idempotency key)
7. Return 200 immediately to Asaas (don't make them wait for processing)
8. Add audit log entry for payment status changes

**Verification:**
```bash
pnpm typecheck && pnpm lint
# Manual: test with Asaas sandbox webhook simulator
```

**Exit Criteria:**
- Raw webhook events stored for idempotency/debugging
- Duplicate webhook deliveries do not double-renew due dates
- Payment status changes only after confirmed Asaas events
- Student due date renews only once per confirmed payment
- Webhook returns 200 immediately

---

#### Agent H: Graduation Progress & Manual Promotion (BJJ-20, BJJ-27)

**Linear:** BJJ-20 + BJJ-27 — Build graduation progress and manual promotion  
**Model:** qwen3.6-plus (UI + domain logic)  
**Branch:** `feat/bjj-20-graduation-promotion`

**Context Brief:**
- Depends on: check-ins working (Wave 1 complete)
- Existing: `src/features/graduation/GraduationPage.tsx` (shell)
- Tables: `checkins`, `graduation_rules`, `bjj_belts`, `students`, `audit_logs`
- Adult belts: Branca → Azul → Roxa → Marrom → Preta → Coral → Vermelha
- Kids belts: Branca → Cinza → Amarela → Laranja → Verde
- Graduation rules: configurable `checkins_per_grau` per academy
- Progress is attendance-informed but promotions are manual (admin-controlled)
- Promotions must be audit logged

**Task List:**
1. Build student graduation view:
   - Current faixa/grau display with belt color
   - Progress bar: X/Y check-ins toward next grau
   - Belt path visualization (adult or kids)
2. Build admin graduation view:
   - Student list with readiness indicators (✓ ready for next grau)
   - Readiness = has enough check-ins per `graduation_rules`
   - Manual promotion action: select new faixa and/or grau
   - Confirmation dialog with current → new progression
3. Create promotion edge function or RPC:
   - Admin-only: update `students.belt_id` and/or `students.grau`
   - Write to `audit_logs` (who promoted, from what to what, when)
   - Validate: new belt/grau must be valid next step in belt path
4. Wire to TanStack Query with optimistic updates
5. Add Portuguese copy: "Graduação", "Faixa", "Grau", "Progresso", "Promover"

**Verification:**
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Exit Criteria:**
- Student sees attendance progress toward next grau
- Admin sees readiness indicators
- Admin can manually promote grau/faixa
- Promotions create audit log entries
- Student progression view reflects approved promotions only
- No auto-promotion — admin must approve all

---

### Wave 4 — PWA Polish & Deployment (2 agents)

Wave 4 starts after all feature work is complete. These are polish and deployment tasks.

---

#### Agent I: PWA Install, Update UX & Mobile QA (BJJ-26/31)

**Linear:** BJJ-26 + BJJ-31 — PWA installability, update prompt, mobile QA  
**Model:** qwen3.6-plus (PWA configuration, well-documented patterns)  
**Branch:** `feat/bjj-26-pwa-polish`

**Context Brief:**
- Vite PWA plugin: `vite-plugin-pwa` (check if installed, add if not)
- Manifest: `public/manifest.json` or generated by plugin
- Icons: need 192x192 and 512x512 PNG icons
- Service worker: app shell caching strategy
- Must NOT cache sensitive business data (payments, check-ins)
- Update prompt: use `registerSW` or `useRegisterSW` from `vite-plugin-pwa/sw`

**Task List:**
1. Configure `vite-plugin-pwa` in `vite.config.ts`:
   - App shell caching (HTML, CSS, JS bundles)
   - Runtime caching for Supabase API calls (network-first)
   - Exclude auth tokens from cache
2. Create/update `public/manifest.json`:
   - App name: "BJJ Academia" or academy-specific
   - Icons: generate placeholder icons (192, 512)
   - Theme color from academy settings
   - Display: standalone
3. Add install prompt component:
   - Detect `beforeinstallprompt` event
   - Show install banner with "Instalar" button
   - iOS Safari: show manual install instructions
4. Add update prompt component:
   - Detect new service worker version
   - Show "Nova versão disponível" toast
   - "Atualizar" button calls `updateSW()`
5. Mobile QA checklist:
   - QR scanner works on HTTPS
   - Camera permission flow
   - Touch targets ≥ 44px
   - Viewport meta tag correct
   - No horizontal scroll on any page

**Verification:**
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
# Manual: install on Android/iOS, test update flow
```

**Exit Criteria:**
- App is installable on Android and iOS home screen
- App shell loads when offline
- Users can refresh when a new version is available
- No sensitive business data cached in service worker
- Mobile QA covers admin QR generation and student QR scan/check-in

---

#### Agent J: Vercel Deployment & Production Secrets (BJJ-32)

**Linear:** BJJ-32 — Verify Vercel deployment and production Supabase secrets  
**Model:** qwen3.6-plus (DevOps/configuration)  
**Branch:** `feat/bjj-32-vercel-deploy`

**Context Brief:**
- `vercel.json` already exists in project root
- Build command: `pnpm build`
- Output directory: `dist/`
- Environment variables needed:
  - Browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Edge Functions: `QR_TOKEN_SECRET`, `ASAAS_API_KEY`, `ASAAS_API_URL`
  - Supabase runtime: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (never in VITE_)
- Supabase CLI: `pnpm dlx supabase` for local dev

**Task List:**
1. Verify `vercel.json` configuration:
   - Build command, output directory, framework detection
   - SPA rewrite rule for client-side routing
   - Headers for security (CSP, HSTS, X-Frame-Options)
2. Create Vercel project configuration:
   - Environment variable documentation
   - Production vs preview environment separation
3. Verify Supabase production project:
   - Run migrations on production database
   - Seed pilot academy data
   - Configure Edge Function secrets
4. Security verification:
   - No `VITE_` prefix on server-only secrets
   - `SUPABASE_SERVICE_ROLE_KEY` never in client bundle
   - `ASAAS_API_KEY` never in client bundle
   - RLS policies active on all tables
5. Create deployment runbook:
   - Step-by-step production deployment
   - Rollback procedure
   - Monitoring/alerting setup

**Verification:**
```bash
pnpm build
# Deploy to Vercel preview
# Test all critical paths on preview URL
```

**Exit Criteria:**
- Vercel deployment builds from `pnpm build` and serves the PWA
- Browser env vars configured: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Edge Function secrets configured: `QR_TOKEN_SECRET`, `ASAAS_API_KEY`
- Supabase runtime service role remains server-only
- Production database has migrations applied and pilot data seeded

---

### Wave 5 — Security & Pilot Readiness (1 agent)

---

#### Agent K: MVP Security & Pilot Readiness Pass (BJJ-21)

**Linear:** BJJ-21 — Run MVP security and pilot readiness pass  
**Model:** kimi-k2.6 (security review, analytical reasoning)  
**Branch:** `feat/bjj-21-security-pilot-pass`

**Context Brief:**
- This is the final gate before pilot launch
- All features must be complete before this starts
- Security-critical paths: RLS, Asaas webhook secrets, QR token expiry, student/admin permissions

**Task List:**
1. RLS review:
   - Verify every table has RLS enabled
   - Test cross-academy access is blocked
   - Test student self-service access is scoped correctly
   - Verify `asaas_payment_events` and `audit_logs` are client-write-protected
2. Asaas webhook security:
   - Verify webhook signature validation
   - Test duplicate webhook delivery handling
   - Verify `ASAAS_API_KEY` never appears in client bundle
3. QR token security:
   - Verify token expiry (15 min default)
   - Test replay attacks (same token used twice)
   - Verify token is session-specific (can't use across sessions)
4. Permission checks:
   - Admin-only routes return 403 for students
   - Student-only routes return 403 for admins
   - No privilege escalation paths
5. Mobile UX smoke test:
   - QR generation works on mobile Chrome/Safari
   - QR scanning works on mobile Chrome/Safari
   - Pix payment flow works end-to-end
   - PWA install works on Android/iOS
6. Backup/export plan:
   - Document Supabase backup procedure
   - Create data export script for pilot academy

**Verification:**
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
# Full end-to-end test on staging
```

**Exit Criteria:**
- All RLS policies verified and tested
- Asaas webhook handling is idempotent and secure
- QR tokens expire and can't be replayed
- Admin/student permission boundaries hold
- Mobile UX works for daily check-ins and Pix mensalidades
- Backup plan documented

---

## Parallelism Summary

```
Wave 1 (3 agents parallel):
  A: QR Scanner Frontend ─────────┐
  B: QR Check-in Backend ──────────┼──→ Wave 2
  C: Student Home + Settings ─────┘

Wave 2 (2 agents parallel):
  D: Check-in Correction ──────────┼──→ Wave 3
  E: Asaas Customer & Cobrança ───┘

Wave 3 (3 agents parallel):
  F: Pix QR Display & History ─────┼──→ Wave 4
  G: Asaas Webhook Idempotency ────┤
  H: Graduation & Promotion ───────┘

Wave 4 (2 agents parallel):
  I: PWA Polish & Mobile QA ───────┼──→ Wave 5
  J: Vercel Deployment ────────────┘

Wave 5 (1 agent):
  K: Security & Pilot Readiness ──────────→ PILOT LAUNCH
```

**Total agents:** 11 (A through K)  
**Total waves:** 5  
**Estimated wall-clock time:** 5 waves × ~1 day each = ~5 days with multi-agent parallelism  
**Linear issues covered:** All 17 remaining backlog issues

---

## Issue Deduplication

The following Linear issues overlap and should be consolidated:

| Superset Issue | Subset Issue | Action |
|---|---|---|
| BJJ-30 (Asaas customer + cobrança flow) | BJJ-23 (Asaas Pix customer and cobrança flow) | Close BJJ-23 as duplicate of BJJ-30 |
| BJJ-29 (Pix QR, copy-paste, payment history) | BJJ-22 (Display Pix QR and copy-paste code) | Close BJJ-22 as duplicate of BJJ-29 |
| BJJ-33 (Idempotent Asaas webhook processing) | BJJ-19 (Asaas webhook idempotency) | Close BJJ-19 as duplicate of BJJ-33 |

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Asaas sandbox API instability | Mock Asaas responses in tests; use sandbox for dev, production for pilot |
| QR scanner camera permissions on iOS | Manual code fallback always available; test on real devices |
| Webhook delivery failures | Store raw events; add retry logic; monitor `asaas_payment_events` for gaps |
| RLS policy gaps | Agent K does full security audit; test with anon/authenticated roles |
| Service worker caching stale data | Network-first strategy for API calls; no business data caching |
| Edge function cold starts | Monitor Supabase function latency; consider warm-up requests |

---

## Verification Protocol

After every agent completes its wave:

1. **Typecheck:** `pnpm typecheck` must pass
2. **Lint:** `pnpm lint` must pass  
3. **Tests:** `pnpm test` must pass (existing + new)
4. **Build:** `pnpm build` must produce valid output
5. **Linear:** Move issue to Done with commit hash and caveats
6. **Merge:** Squash-merge feature branch to main after review

Final gate (Agent K):
- Full `typecheck → lint → test → build` pipeline
- End-to-end test on staging environment
- Security audit checklist complete
- Pilot academy can run daily check-ins and Pix mensalidades
