-- Migration 027: Backfill job_workers from orientation_completions
-- Workers who passed orientation are auto-added to that job's roster.
-- Three join paths to handle records created before/after migration 024.

-- Path 1: direct worker_id FK (older completion records from migration 019 era)
INSERT INTO job_workers (job_id, worker_id, added_at)
SELECT DISTINCT ON (oc.job_id, oc.worker_id)
  oc.job_id,
  oc.worker_id,
  oc.completed_at
FROM orientation_completions oc
WHERE oc.worker_id IS NOT NULL
  AND oc.passed = true
ON CONFLICT (job_id, worker_id) DO NOTHING;

-- Path 2: via auth_user_id link (migration 024+ records)
INSERT INTO job_workers (job_id, worker_id, added_at)
SELECT DISTINCT ON (oc.job_id, w.id)
  oc.job_id,
  w.id,
  oc.completed_at
FROM orientation_completions oc
JOIN workers w ON w.auth_user_id = oc.worker_profile_id
WHERE oc.worker_profile_id IS NOT NULL
  AND oc.passed = true
ON CONFLICT (job_id, worker_id) DO NOTHING;

-- Path 3: email fallback (org-scoped to prevent cross-org collisions)
INSERT INTO job_workers (job_id, worker_id, added_at)
SELECT DISTINCT ON (oc.job_id, w.id)
  oc.job_id,
  w.id,
  oc.completed_at
FROM orientation_completions oc
JOIN workers w
  ON LOWER(w.email) = LOWER(oc.worker_email)
  AND w.organization_id = oc.organization_id
WHERE oc.worker_email IS NOT NULL
  AND oc.passed = true
ON CONFLICT (job_id, worker_id) DO NOTHING;
