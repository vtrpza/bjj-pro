# AGENTS.md

## Project Overview

BJJ-only academy management PWA. `ProjectBJJGYM.html` is the product/design reference only, not production architecture.

**Stack:** React 19 + Vite 7 + TypeScript 6, Supabase (auth, Postgres, RLS, edge functions), Asaas Pix (payments), Vercel (deploy).

**Scope:** Mobile-first PWA for Brazilian Jiu-Jitsu academies. QR-code training check-ins. Pix-only mensalidades via Asaas. Manual grau/faixa promotions. Multi-academy schema, single pilot launch.

## Build and Test Commands

```bash
pnpm install          # install deps (packageManager: pnpm@10.33.0)
pnpm dev              # start Vite dev server
pnpm typecheck        # tsc -b
pnpm lint             # eslint .
pnpm test             # vitest run (22 tests, 4 test files, jsdom env)
pnpm build            # tsc -b && vite build
pnpm preview          # vite preview
```

**Supabase local:**
```bash
pnpm dlx supabase start
pnpm dlx supabase db reset   # runs migrations + seed.sql
```

**Verification order:** `typecheck -> lint -> test -> build`

## Code Style Guidelines

- **Language:** Portuguese UI copy; English code identifiers (except domain terms like `mensalidade`, `grau`, `faixa`).
- **Terminology:** Academia de Jiu-Jitsu, Aluno, Treino, Check-in no treino, Mensalidade, Faixa, Grau, Graduação. Avoid MMA/Muay Thai/Boxe/Modalidade/fitness/studio/gym language.
- **TypeScript:** Strict mode enabled (`strict: true`). Target ES2022, module ESNext, bundler resolution. JSX transform: `react-jsx`.
- **File extensions:** `.tsx` for components, `.ts` for utilities/hooks/domain logic.
- **Formatting:** No Prettier configured; rely on ESLint. Run `pnpm lint` before committing.
- **ESLint config:** `@eslint/js` recommended + `typescript-eslint` recommended + `react-hooks` + `react-refresh` (allows constant exports). Ignores `dist/`.
- **Imports:** Use `type` imports for type-only dependencies. Prefer explicit file extensions in imports (Vite handles resolution).
- **Environment access:** Browser code uses `import.meta.env.VITE_*` only. Never access `process.env` in frontend code.

## Testing Instructions

- **Runner:** Vitest 4 with jsdom environment (configured in `vite.config.ts`).
- **Test files:** Co-located with source files using `.test.ts` or `.test.tsx` suffix.
- **Current test files (4 files, 22 tests):**
  - `src/app/providers/authAccess.test.ts` — auth role access logic (5 tests)
  - `src/shared/domain/academy.test.ts` — dashboard metrics, date helpers, form validation, payload normalization (5 tests)
  - `src/shared/domain/studentSummary.test.ts` — student summary calculations (6 tests)
  - `src/shared/lib/qrCheckin.test.ts` — QR expiry math, token parsing, check-in body builders (6 tests)
- **No E2E tests** are currently configured. No component/integration test coverage for feature pages.
- **Writing tests:** Use `describe`/`it` from `vitest`. No explicit `expect` import needed (vitest globals not enabled, import from `vitest`).
- **Edge functions:** Deno is not installed locally — edge functions cannot be typechecked with `deno check` here. Rely on deployment-time validation.

## Frontend Architecture (`src/`)

### Directory Structure

```
src/
  main.tsx                          # Entry point: StrictMode + AppProviders + RouterProvider
  vite-env.d.ts                     # Vite client types
  app/
    layouts/
      AcademyLayout.tsx             # Admin shell with sidebar, topbar, bottom-nav
      StudentLayout.tsx             # Student shell with bottom-nav only
    providers/
      AppProviders.tsx              # Composes QueryProvider + AuthProvider + PWA prompts
      AuthProvider.tsx              # Supabase auth state, profile/member resolution, placeholder mode
      AuthContext.ts                # Typed React context for auth state
      QueryProvider.tsx             # TanStack QueryClient (staleTime 30s, retry 1, no window refetch)
      authAccess.ts                 # Role-based access helper (`canAccessRole`)
    router/
      router.tsx                    # BrowserRouter with role-guarded route trees
      ProtectedRoute.tsx            # Redirects unauth/unauthorized users to /login
  features/                         # One directory per feature; pages are default exports
    academy/
      AcademyDashboardPage.tsx      # Admin dashboard with metrics cards
    auth/
      LoginPage.tsx
      PasswordResetPage.tsx
      LogoutButton.tsx
    checkins/
      CheckinsPage.tsx              # Admin: training session list + QR generation
      CheckinReviewPage.tsx         # Admin: review/correct check-ins for a session
      StudentCheckinPage.tsx        # Student: QR scanner + manual fallback
    graduation/
      GraduationPage.tsx            # Shared: admin promotion + student progress view
    payments/
      PaymentsPage.tsx              # Admin: payment oversight, filterable by status
      StudentPaymentPage.tsx        # Student: Pix payment screen (QR + copia-e-cola + history)
    settings/
      SettingsPage.tsx              # Admin: academy branding + checkins-per-grau
    student-home/
      StudentHomePage.tsx           # Student: mensalidade status, faixa/grau, progress, quick actions
      StudentProfilePage.tsx        # Student: editable full_name/phone with BR mask
    students/
      StudentsPage.tsx              # Admin: student CRUD with form + list
  shared/
    components/
      Button.tsx
      PageHeader.tsx
      StatCard.tsx
      StateViews.tsx                # LoadingState, ErrorState, EmptyState
      InstallPrompt.tsx             # PWA install detection (Android beforeinstallprompt + iOS instructions)
      UpdatePrompt.tsx              # PWA update toast with "Atualizar" button
    domain/
      academy.ts                    # Types, Zod schemas, belt paths, dashboard metrics, formatters
      studentSummary.ts             # Student-facing summary calculations
    lib/
      supabase.ts                   # Supabase client with persistSession: true
      academyQueries.ts             # TanStack Query fetchers for students, belts, settings
      studentQueries.ts             # TanStack Query fetchers for student home data
      qrCheckin.ts                  # QR token parsing, expiry math, check-in body builders
      navigation.ts                 # Admin and student navigation item arrays
    styles/
      global.css                    # App shell, layout, forms, cards, belt color utilities
```

### Key Patterns

- **Feature-oriented structure:** Pages live in `features/`, shared utilities in `shared/`, app wiring in `app/`.
- **State management:** TanStack Query for server state; React Hook Form + Zod for forms; no global client state library.
- **Data fetching:** Query functions are extracted to `shared/lib/*Queries.ts`. Queries are enabled only when `supabase && academyId && !isPlaceholderMode`.
- **Auth flow:** Supabase Auth → `profiles` + `academy_members` lookup → app role (`academy_admin`, `academy_staff`, `student`).
- **Placeholder mode:** When `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, the app runs with a hardcoded admin profile so UI can be developed offline.
- **PWA:** `vite-plugin-pwa` with `registerType: 'prompt'`. App shell precached. Supabase REST uses NetworkFirst (1h cache). Auth endpoints use NetworkOnly.

### Routes

| Path | Role | Page |
|------|------|------|
| `/login` | public | LoginPage |
| `/login/reset` | public | PasswordResetPage |
| `/admin` | `academy_admin` | AcademyDashboardPage |
| `/admin/alunos` | `academy_admin` | StudentsPage |
| `/admin/check-ins` | `academy_admin` | CheckinsPage |
| `/admin/check-ins/review/:sessionId` | `academy_admin` | CheckinReviewPage |
| `/admin/mensalidades` | `academy_admin` | PaymentsPage |
| `/admin/graduacao` | `academy_admin` | GraduationPage |
| `/admin/configuracoes` | `academy_admin` | SettingsPage |
| `/aluno` | `student` | StudentHomePage |
| `/aluno/check-in` | `student` | StudentCheckinPage |
| `/aluno/mensalidade` | `student` | StudentPaymentPage |
| `/aluno/graduacao` | `student` | GraduationPage |
| `/aluno/perfil` | `student` | StudentProfilePage |

## Supabase Architecture (`supabase/`)

### Migrations

All migrations are in `supabase/migrations/` and run in lexical order:

1. `20260424000100_bjj_mvp_foundation.sql` — Core schema: academies, profiles, academy_members, bjj_belts, students, training_sessions, checkins, payments, asaas_customers, asaas_payment_events, expenses, graduation_rules, audit_logs. RLS policies. Helper functions (`current_user_has_academy_role`, `current_user_is_academy_member`, `current_user_is_academy_admin`, `current_user_is_academy_student`).
2. `20260425000100_add_academy_checkins_per_grau.sql` — Adds `checkins_per_grau` to `academies`.
3. `20260428000100_checkin_correction_support.sql` — Adds `status`, `corrected_by`, `corrected_at`, `source` to `checkins`. Partial unique index for valid checkins only.
4. `20260428000200_asaas_webhook_support.sql` — Adds `asaas_payment_events` table and related indexes.
5. `20260429050208_bjj_mvp_schema.sql` — Additional schema adjustments.
6. `20260429050731_seed_pilot_users.sql` — Pilot user seeding.

### Seed Data

`supabase/seed.sql` — Pilot academy, BJJ belt paths, graduation defaults.

### Key Tables

| Table | Purpose | Client Write |
|-------|---------|--------------|
| `academies` | Academy config, branding, checkins_per_grau | Admin update only |
| `profiles` | User profile (full_name, phone, avatar) | Own profile only |
| `academy_members` | User-to-academy membership with role | Admin only |
| `bjj_belts` | Global belt paths (adult + kids) | Read-only for clients |
| `students` | Student records linked to profile + belt | Admin only |
| `training_sessions` | Treino sessions; QR token hash + expiry | Admin insert/update, but **cannot write QR fields** |
| `checkins` | Student check-ins per session | **No direct client insert** — only via Edge Function |
| `payments` | Mensalidade Pix cobranças | Admin insert/update, **cannot set paid** |
| `asaas_customers` | Asaas customer ID per student | Admin read only |
| `asaas_payment_events` | Raw webhook events for idempotency | **No client write policies** |
| `expenses` | Academy expenses | Admin only |
| `graduation_rules` | Checkins/days required per belt+grau | Admin only |
| `audit_logs` | Immutable action log | **No client write policies** |

### RLS Principles

- RLS enabled on all tables from the foundation migration.
- Authenticated users have broad grants, but policies restrict access per academy and role.
- Students can read their own data and their academy's training sessions.
- Admins (owner/admin) can CRUD most academy data.
- Coaches (academy_staff) can read students, checkins, payments, but cannot modify.
- **Critical restriction:** Clients cannot write `asaas_payment_events`, `audit_logs`, or create check-ins directly. Payment status can never be set to `paid` from the client.
- `training_sessions` QR fields (`qr_token_hash`, `qr_expires_at`) are writable only by service role / edge functions.

## Edge Functions (`supabase/functions/`)

All edge functions run on Deno 2 and use shared utilities in `_shared/`.

### Shared Utilities (`_shared/`)

- `env.ts` — Env var validation with `requireEnv()`.
- `http.ts` — CORS headers, JSON/error response helpers, `assertPost`, `readJsonObject`, `ApiError`.
- `supabase.ts` — `createServiceClient()` using service role key; `getAuthUser()` from Bearer token.
- `qr.ts` — HMAC-SHA256 QR token signing/verification, SHA-256 hex hashing, manual code generation.
- `validation.ts` — Input validation helpers.

### Functions

| Function | Method | Auth | Purpose |
|----------|--------|------|---------|
| `qr-session-token` | POST | Admin | Creates/opens current treino, returns short-lived signed QR token + uppercase manual code. |
| `checkin-validate` | POST | Student | Validates QR/manual code; checks expiry, academy/session/student match, open session, duplicate; inserts check-in + audit log. Returns structured error codes (`INVALID_CODE`, `TOKEN_EXPIRED`, `SESSION_CLOSED`, `DUPLICATE_CHECKIN`, `NOT_MEMBER`). |
| `checkin-correct` | POST | Admin | Admin-only check-in correction with required reason; updates status to `cancelled` + audit log. |
| `asaas-pix-create` | POST | Admin | Creates/links Asaas customer, creates/reuses Pix cobrança, returns QR payload + copy-paste text. |
| `asaas-webhook` | POST | Webhook token | Idempotent webhook processing; stores raw events; updates payment status + renews student `next_due_date` on confirmation. Handles `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`. |
| `graduation-promote` | POST | Admin | Admin-only grau/faixa promotion with belt path validation + audit log. |

## Environment Variables

### Browser/Vite (safe to expose)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Copy `.env.example` to `.env.local` for local development.

### Edge Functions / Supabase Secrets (NEVER commit, NEVER prefix with `VITE_`)
- `QR_TOKEN_SECRET` — HMAC key for QR tokens
- `ASAAS_API_KEY` — Asaas API key
- `ASAAS_API_URL` — e.g. `https://sandbox.asaas.com/api/v3`
- `ASAAS_WEBHOOK_TOKEN` — Webhook authentication token
- `SUPABASE_URL` — Same as VITE_SUPABASE_URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key for edge functions

**Security rule:** Never expose Asaas secret keys, service role keys, or webhook tokens to the browser.

## Deployment

**Platform:** Vercel
**Framework preset:** Vite
**Install:** `pnpm install`
**Build:** `pnpm build`
**Output:** `dist/`
**Rewrites:** All routes → `/` (SPA behavior)
**Security headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`

Configured in `vercel.json`.

## Security Considerations

- **Payment integrity:** Payment status is updated only from the trusted Asaas webhook edge function. Clients cannot mark payments as paid. RLS enforces this.
- **QR integrity:** QR tokens are HMAC-SHA256 signed with a server-side secret. Verification happens in the `checkin-validate` edge function. Admins cannot write QR token fields on `training_sessions` via RLS.
- **Check-in uniqueness:** One check-in per student per session enforced by a unique constraint (`checkins_unique_student_session`). Cancelled check-ins use a partial unique index so they don't block re-check-ins.
- **Audit trail:** All sensitive actions (payment updates, check-in creation/correction, graduation promotions) write to `audit_logs`.
- **Auth persistence:** Supabase client uses `persistSession: true` so tokens auto-refresh across reloads.
- **Idempotency:** Asaas webhook stores events by `asaas_event_id` and skips already-processed events.

## BJJ Graduation Rules

**Adult belt path:** Branca → Azul → Roxa → Marrom → Preta → Coral → Vermelha
**Kids belt path:** Branca → Cinza → Amarela → Laranja → Verde

Check-ins calculate progress toward next grau. Admin must manually approve all promotions. Promotions are audit logged. Do not encode irreversible federation promotion rules.

## QR Check-In Rules

- Training-session QR codes (not permanent student QRs).
- Admin generates short-lived signed token via `qr-session-token` edge function.
- Student scans via PWA camera (requires HTTPS) with jsqr fallback + manual code entry.
- Backend validates: academy match, session match, token expiry, token signature, session is open, student is active, no duplicate check-in.

## Asaas Pix Rules

- Create/link Asaas customer per student.
- Create/reuse open Pix cobrança via `asaas-pix-create`.
- Display QR/copy-paste to student.
- Process webhooks in `asaas-webhook`.
- Store raw events for idempotency.
- Mark paid only after confirmed webhook.
- Renew `students.next_due_date` once per confirmed payment (adds 1 month).

## Out of Scope for MVP

Native apps, card/boleto/Pix Automático, Asaas subscriptions, payment split, refunds/chargebacks (webhook records them but no UI), offline write sync, WhatsApp automation, automatic belt promotion.

## Notes for AI Agents

- When adding a new feature page, place it in `features/<feature-name>/` and register the route in `src/app/router/router.tsx`.
- When adding new domain types or validation schemas, add them to `src/shared/domain/academy.ts` and write tests in a co-located `.test.ts` file.
- When adding Supabase queries, add fetcher functions to `shared/lib/*Queries.ts` and use them via `useQuery`/`useMutation` in pages.
- When modifying RLS or schema, add a new migration file with a timestamp prefix. Do not edit existing migration files that may already be applied.
- When adding edge functions, follow the existing pattern: `Deno.serve()` with `OPTIONS` CORS handling, `assertPost()`, `getAuthUser()`, structured error responses, and audit logging.
- The app supports a **placeholder mode** when Supabase env vars are missing. Always guard Supabase-dependent UI with `canUseSupabase` checks so the page still renders offline.
