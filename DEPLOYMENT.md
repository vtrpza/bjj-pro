# Deployment Runbook — BJJ Academia PWA

## Production Deployment

### Prerequisites
- Vercel account connected to GitHub repo
- Supabase production project created
- Asaas production account (or sandbox for pilot)

### Step 1: Supabase Production Setup
1. Create Supabase project at https://supabase.com
2. Run all migrations:
   ```bash
   supabase db push
   ```
3. Run seed data:
   ```bash
   supabase db seed
   ```
4. Configure Edge Function secrets in Supabase dashboard:
   - `QR_TOKEN_SECRET` — HMAC secret for QR token signing
   - `ASAAS_API_KEY` — Asaas API access token
   - `ASAAS_API_URL` — Asaas base URL (`https://sandbox.asaas.com/api/v3` or production)
   - `ASAAS_WEBHOOK_TOKEN` — Asaas webhook verification token
   - `SUPABASE_URL` — Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
5. Deploy edge functions:
   ```bash
   supabase functions deploy qr-session-token
   supabase functions deploy checkin-validate
   supabase functions deploy checkin-correct
   supabase functions deploy asaas-pix-create
   supabase functions deploy asaas-webhook
   supabase functions deploy graduation-promote
   ```

### Step 2: Vercel Deployment
1. Connect GitHub repo to Vercel
2. Configure environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy:
   ```bash
   vercel --prod
   ```
   Or push to `main` branch for auto-deploy

### Step 3: Verify Deployment
1. Visit production URL
2. Test login flow
3. Test admin dashboard
4. Test student home
5. Test QR generation (admin)
6. Test QR scanning (student)
7. Test Pix payment flow
8. Test PWA install
9. Test update prompt

### Rollback Procedure
1. In Vercel dashboard, go to Deployments
2. Find last known good deployment
3. Click "Promote to Production"
4. Verify rollback by testing critical flows

### Monitoring
- **Vercel:** check deployment logs and function logs
- **Supabase:** check Edge Function logs and database query performance
- **Asaas:** check webhook delivery logs and payment events

---

## Security Verification Checklist

### Environment Variables
- [ ] No `VITE_` prefix on server-only secrets (`QR_TOKEN_SECRET`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never in client bundle — only used in Edge Functions
- [ ] `ASAAS_API_KEY` never in client bundle — only used in Edge Functions
- [ ] `QR_TOKEN_SECRET` never in client bundle — only used in Edge Functions
- [ ] `.env.local` is in `.gitignore` and never committed

### Row-Level Security (RLS)
- [ ] RLS policies active on all tables (`academies`, `profiles`, `academy_members`, `students`, `bjj_belts`, `training_sessions`, `checkins`, `payments`, `asaas_customers`, `asaas_payment_events`, `expenses`, `graduation_rules`, `audit_logs`)
- [ ] Clients cannot write to `asaas_payment_events`, `audit_logs`, or create check-ins directly
- [ ] Admins cannot write QR token fields on `training_sessions`

### Edge Functions
- [ ] Edge functions use service-role client (not anon) for trusted operations
- [ ] Webhook token verification is enabled for Asaas webhook endpoint
- [ ] QR tokens have expiry (15 min default)
- [ ] QR token validation checks academy, session, token, expiry, identity, and duplicate status

### Audit Logging
- [ ] Audit logs are being written for sensitive actions:
  - Payment status updates
  - Student deletions
  - Check-in corrections
  - Belt/grade promotions
- [ ] Audit log table has RLS preventing client writes

### PWA Security
- [ ] Service worker served over HTTPS only
- [ ] Camera access for QR scanning requires HTTPS
- [ ] Security headers configured in `vercel.json`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## Environment Variables Reference

### Browser/Vite (exposed to client via `VITE_` prefix)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJ...` |

### Edge Functions (server-side only, NEVER expose via `VITE_`)
| Variable | Description | Example |
|----------|-------------|---------|
| `QR_TOKEN_SECRET` | HMAC secret for QR token signing | `your-random-secret` |
| `ASAAS_API_KEY` | Asaas API access token | `$aact_...` |
| `ASAAS_API_URL` | Asaas base URL | `https://sandbox.asaas.com/api/v3` |
| `ASAAS_WEBHOOK_TOKEN` | Asaas webhook verification token | `your-webhook-token` |
| `SUPABASE_URL` | Supabase project URL (for edge functions) | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
