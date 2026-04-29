# Security Audit — BJJ Academia PWA

## Date: 2026-04-28
## Auditor: Agent K (Wave 5)
## Branch: `feat/bjj-21-security-pilot-pass`

## Summary

**Overall assessment: PASS with fixes**

One HIGH severity bug found and fixed: `checkin-validate` edge function used wrong column names for `audit_logs` inserts, causing silent audit log failures. All other security controls are correctly implemented.

---

## Findings

### HIGH — `checkin-validate` audit log column mismatch (FIXED)

**File:** `supabase/functions/checkin-validate/index.ts:108-115`

**Description:** The audit log insert used incorrect column names:
- `user_id` → should be `actor_user_id`
- `entity_type` → should be `entity_table`
- `details` → should be `metadata`

**Impact:** Audit log inserts would fail with column-not-found errors. Check-ins would still succeed (insert happens before audit log), but the audit trail would be incomplete. The error was caught by the try/catch and returned as 500 to the client, potentially causing false failure responses for successful check-ins.

**Fix:** Corrected column names to match `audit_logs` table schema defined in `20260424000100_bjj_mvp_foundation.sql`.

---

### MEDIUM — CORS `Access-Control-Allow-Origin: *` (DOCUMENTED)

**File:** `supabase/functions/_shared/http.ts:4`

**Description:** CORS headers allow any origin to call edge functions.

**Impact:** Any website could make cross-origin requests to edge functions. However, all functions require valid Supabase auth tokens (Bearer token verification), so an attacker would still need a valid user session. Risk is limited to CSRF-style attacks against authenticated users.

**Recommendation:** Before full production launch, restrict `Access-Control-Allow-Origin` to the deployed Vercel domain(s). For pilot, `*` is acceptable since the attack surface is minimal.

---

### LOW — Supabase REST API cached in service worker (DOCUMENTED)

**File:** `vite.config.ts:17-23`

**Description:** Supabase REST API responses are cached with `NetworkFirst` strategy and 1-hour max age.

**Impact:** Sensitive data (student info, payment status) could be cached on the device. Risk is limited to device compromise scenarios. The cache is not shared across users and is cleared on PWA update.

**Recommendation:** Consider reducing `maxAgeSeconds` to 300 (5 min) or using `NetworkOnly` for payment-related endpoints. Acceptable for pilot.

---

## RLS Verification

| Table | RLS Enabled | Select Policy | Insert Policy | Update Policy | Delete Policy | Notes |
|-------|-------------|---------------|---------------|---------------|---------------|-------|
| `academies` | Yes | Members + students | None | Admins only | None | Admins can update academy settings |
| `profiles` | Yes | Own + admin | Own only | Own only | None | Cascade delete from auth.users |
| `academy_members` | Yes | Own + admin | Admins only | Admins only | Admins only | Role management restricted to admins |
| `bjj_belts` | Yes | All authenticated | None | None | None | Global reference data |
| `students` | Yes | Staff + self | Admins only | Admins only | Admins only | Students can view own record |
| `training_sessions` | Yes | Members + students | Admins only (no QR fields) | Admins only (no QR fields) | Admins only | QR token fields protected |
| `checkins` | Yes | Staff + self | **None** (edge function only) | Admins only (correction) | None | Unique constraint prevents duplicates |
| `payments` | Yes | Staff + self | Admins only (not paid) | Admins only (not paid) | Admins only (not paid) | Cannot set status='paid' via RLS |
| `asaas_customers` | Yes | Admins only | None | None | None | Managed by edge functions |
| `asaas_payment_events` | Yes | Admins only | **None** (service role only) | **None** | **None** | Webhook edge function writes via service role |
| `expenses` | Yes | Admins only | Admins only | Admins only | Admins only | Full admin control |
| `graduation_rules` | Yes | Members + students | Admins only | Admins only | Admins only | Academy-scoped or global defaults |
| `audit_logs` | Yes | Admins only | **None** (service role only) | **None** | **None** | No client write policies |

### Key RLS Controls Verified

- **`asaas_payment_events`** — No insert/update/delete policies for authenticated users. Only service-role edge function can write.
- **`audit_logs`** — No insert/update/delete policies for authenticated users. Only service-role edge functions can write.
- **`payments`** — `payments_update_for_admins_not_paid` requires `status <> 'paid'` AND `paid_at is null`. Clients cannot mark payments as paid.
- **`checkins`** — No insert policy for authenticated users. Only `checkin-validate` edge function can create check-ins (uses service role).
- **`training_sessions`** — Admins cannot write `qr_token_hash` or `qr_expires_at` directly; only edge function can set these.

---

## Edge Function Security

| Function | Service Role | Auth Verification | Academy Check | CORS | Notes |
|----------|-------------|-------------------|---------------|------|-------|
| `qr-session-token` | Yes | `getAuthUser` | Admin membership | `*` | TTL capped at 30 min |
| `checkin-validate` | Yes | `getAuthUser` | Student membership | `*` | Fixed: audit log columns |
| `checkin-correct` | Yes | `getAuthUser` | Admin membership | `*` | Requires reason (5+ chars) |
| `asaas-pix-create` | Yes | `getAuthUser` | Student active status | `*` | ASAAS_API_KEY server-side |
| `asaas-webhook` | Yes | Webhook token | N/A | `*` | Idempotent via event ID |
| `graduation-promote` | Yes | `getAuthUser` | Admin membership | `*` | Validates promotion path |

### Edge Function Security Controls

- **All functions use service-role client** — Bypasses RLS for trusted operations.
- **All functions verify auth** — Either via `getAuthUser` (Bearer token) or webhook token.
- **All admin functions verify membership** — Query `academy_members` for `owner`/`admin` role.
- **QR tokens** — HMAC-SHA256 signed, session-specific, expiry enforced (10-30 min).
- **Webhook idempotency** — `asaas_event_id` unique constraint + lookup before insert + 23505 handling.
- **Asaas API key** — Only in edge functions via `requireEnv('ASAAS_API_KEY')`, never in client bundle.

---

## Environment Variables

| Variable | Scope | Prefix | Client Bundle | Notes |
|----------|-------|--------|---------------|-------|
| `VITE_SUPABASE_URL` | Browser | `VITE_` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | `VITE_` | Yes | Supabase anon/public key |
| `QR_TOKEN_SECRET` | Edge | None | No | HMAC signing secret |
| `ASAAS_API_KEY` | Edge | None | No | Asaas API access token |
| `ASAAS_API_URL` | Edge | None | No | Asaas base URL |
| `ASAAS_WEBHOOK_TOKEN` | Edge | None | No | Webhook verification token |
| `SUPABASE_URL` | Edge | None | No | Supabase URL for edge functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge | None | No | Supabase service role key |

### Verification

- **No `VITE_` prefix on server secrets** — Confirmed in `.env.example`.
- **`SUPABASE_SERVICE_ROLE_KEY` not in client** — Only used in `supabase/functions/_shared/supabase.ts` via `requireEnv`.
- **`ASAAS_API_KEY` not in client** — Only used in `asaas-pix-create/index.ts` via `requireEnv`.
- **`QR_TOKEN_SECRET` not in client** — Only used in `qr-session-token` and `checkin-validate` via `requireEnv`.
- **`ASAAS_WEBHOOK_TOKEN` not in client** — Only used in `asaas-webhook/index.ts` via `requireEnv`.

---

## Permission Checks

### Route Protection

| Route | Allowed Roles | 403 for Others | Implementation |
|-------|--------------|----------------|----------------|
| `/admin/*` | `academy_admin` | Yes | `ProtectedRoute` + `canAccessRole` |
| `/aluno/*` | `student` | Yes | `ProtectedRoute` + `canAccessRole` |
| `/login` | Public | N/A | No protection |

### Privilege Escalation Prevention

- **Profile updates** — `profiles_update_own` policy restricts to `id = auth.uid()`. Role is stored in `academy_members`, not `profiles`, so students cannot change their role.
- **Academy member updates** — `academy_members_update_for_admins` requires admin role. Students cannot promote themselves.
- **Client-side role** — `AuthProfile.role` is derived from `academy_members` query, not client-controlled.

---

## PWA Security

| Control | Status | Notes |
|---------|--------|-------|
| Auth endpoints `NetworkOnly` | Yes | `/auth/v1/` never cached |
| No sensitive data in precache | Yes | Only static assets cached |
| Service worker scope | `/` | Correct for SPA |
| Security headers | Yes | `vercel.json` configures X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy |
| HTTPS required | Yes | Camera API requires secure context |

---

## Recommendations (Pre-Production)

1. **Restrict CORS origins** — Replace `*` with deployed Vercel domain in `supabase/functions/_shared/http.ts`.
2. **Reduce Supabase API cache TTL** — Change from 3600s to 300s in `vite.config.ts` for sensitive endpoints.
3. **Add Content-Security-Policy header** — Configure in `vercel.json` to restrict script sources.
4. **Add rate limiting** — Consider Supabase edge function rate limiting for check-in and webhook endpoints.
5. **Monitor audit logs** — Set up alerts for failed audit log inserts (indicates edge function errors).
6. **Rotate secrets** — Rotate `QR_TOKEN_SECRET`, `ASAAS_WEBHOOK_TOKEN`, and `SUPABASE_SERVICE_ROLE_KEY` before production launch.

---

## Verification Commands

```bash
cd /home/vitorp/ProjectBJJGym && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

All four commands must pass after fixes.

---

## Files Modified

| File | Change | Reason |
|------|--------|--------|
| `supabase/functions/checkin-validate/index.ts` | Fixed audit log column names | `user_id` → `actor_user_id`, `entity_type` → `entity_table`, `details` → `metadata` |

## Files Created

| File | Purpose |
|------|---------|
| `SECURITY_AUDIT.md` | This audit report |
