-- Migration 001: Store order Stripe fields
-- Run: node run-migration.mjs migrations/001_store_order_stripe_fields.sql
--
-- Idempotent: runner skips statements that fail with "Duplicate column name".

-- store_orders: Stripe payment intent tracking (added by Fix 1)
-- Already applied in previous run — included here for documentation.
ALTER TABLE store_orders
  ADD COLUMN stripePaymentIntentId VARCHAR(255) NULL AFTER shippingPhone;

-- custom_orders: add paidAmount as decimal (column was referenced in webhook
-- code but never actually created in the DB)
ALTER TABLE custom_orders
  ADD COLUMN paidAmount DECIMAL(10, 2) NULL;

-- custom_orders: Stripe payment intent tracking
ALTER TABLE custom_orders
  ADD COLUMN stripePaymentIntentId VARCHAR(255) NULL;
