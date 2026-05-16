ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS billing_period_end      timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_stripe_customer_id_idx
  ON organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
