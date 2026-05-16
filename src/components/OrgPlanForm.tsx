'use client'

import { useTransition } from 'react'
import { updateOrgPlan } from '@/app/actions/platform'

const PLAN_COLORS: Record<string, string> = {
  free:    'text-slate-600 bg-slate-100 border-slate-200',
  starter: 'text-orange-700 bg-orange-50 border-orange-200',
  pro:     'text-purple-700 bg-purple-50 border-purple-200',
}

export function OrgPlanForm({ orgId, currentPlan }: { orgId: string; currentPlan: string }) {
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const plan = e.target.value
    startTransition(() => { updateOrgPlan(orgId, plan) })
  }

  return (
    <select
      defaultValue={currentPlan}
      onChange={handleChange}
      disabled={pending}
      className={`rounded-md border px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 ${PLAN_COLORS[currentPlan] ?? PLAN_COLORS.free}`}
    >
      <option value="free">Free</option>
      <option value="starter">Starter</option>
      <option value="pro">Pro</option>
    </select>
  )
}
