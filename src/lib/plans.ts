export type Plan = 'free' | 'starter' | 'pro'

export const PLAN_LIMITS: Record<Plan, { workers: number; equipment: number; jhas: number; toolboxTalks: number }> = {
  free:    { workers: 5,        equipment: 1,        jhas: 5,        toolboxTalks: 5 },
  starter: { workers: Infinity, equipment: Infinity, jhas: Infinity, toolboxTalks: Infinity },
  pro:     { workers: Infinity, equipment: Infinity, jhas: Infinity, toolboxTalks: Infinity },
}

export const PLAN_LABELS: Record<Plan, string> = {
  free:    'Free',
  starter: 'Starter',
  pro:     'Pro',
}

export function isValidPlan(p: unknown): p is Plan {
  return p === 'free' || p === 'starter' || p === 'pro'
}

export function getPlan(raw: unknown): Plan {
  return isValidPlan(raw) ? raw : 'free'
}
