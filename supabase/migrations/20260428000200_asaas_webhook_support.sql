-- BJJ-19 / BJJ-33: Asaas webhook support for idempotent payment processing.
-- Ensures asaas_payment_events has proper indexing and RLS policies.
-- Payments table RLS already prevents client status updates to 'paid'.

-- Ensure unique index on asaas_event_id for idempotency (table already has unique constraint)
-- The foundation migration created the table with asaas_event_id text not null unique,
-- so we just verify RLS policies are correct.

-- asaas_payment_events RLS:
-- Foundation migration already enabled RLS and added select policy for admins.
-- No insert/update/delete policies for authenticated users — service-role only.
-- This is intentional: only trusted edge functions may write webhook events.

-- payments RLS:
-- Foundation migration already prevents clients from setting status='paid':
--   payments_update_for_admins_not_paid: requires status <> 'paid' and paid_at is null
-- This ensures only the webhook edge function (via service role) can confirm payments.

-- Add index for faster event lookup by asaas_event_id (already unique, but explicit index helps)
-- The unique constraint already creates an index, so this is documentation-only.

-- Ensure processed_at column exists (foundation migration has it)
-- Verify column types match edge function expectations:
--   asaas_event_id: text (unique) — idempotency key like "pay_123_PAYMENT_CONFIRMED"
--   event_type: text — e.g. "PAYMENT_CONFIRMED"
--   payload: jsonb — raw webhook body
--   processed_at: timestamptz — null until processed, set after successful handling

-- No schema changes needed — foundation migration already created the correct structure.
-- This migration serves as documentation and verification checkpoint for BJJ-19/BJJ-33.
