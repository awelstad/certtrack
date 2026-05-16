-- Add self-serve trial columns to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at    timestamptz,
  ADD COLUMN IF NOT EXISTS plan             text,
  ADD COLUMN IF NOT EXISTS trial_status     text;

-- plan values: 'free' | 'starter' | 'pro' | 'enterprise' (null = manually managed)
-- trial_status values: 'trialing' | 'active' | 'expired' (null = manually managed org, no trial)
