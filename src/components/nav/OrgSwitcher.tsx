'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { switchToOrg, exitOrgSwitch } from '@/app/actions/platform'
import { X } from 'lucide-react'

type Props = {
  orgs: { id: string; name: string }[]
  activeOrgId: string | null
  activeOrgName: string
}

export function OrgSwitcher({ orgs, activeOrgId, activeOrgName }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSwitch(orgId: string) {
    startTransition(async () => {
      await switchToOrg(orgId)
      router.push('/dashboard')
      router.refresh()
    })
  }

  function handleExit() {
    startTransition(async () => {
      await exitOrgSwitch()
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <div className="border-b border-slate-800 px-3 py-2.5">
      <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
        Org View
      </p>

      {activeOrgId && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <div className="flex-1 truncate rounded-lg bg-orange-500/20 px-2.5 py-1 text-xs font-medium text-orange-300">
            {activeOrgName}
          </div>
          <button
            onClick={handleExit}
            disabled={pending}
            title="Exit org view"
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <select
        value={activeOrgId ?? ''}
        onChange={(e) => e.target.value && handleSwitch(e.target.value)}
        disabled={pending}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 focus:border-orange-400 focus:outline-none disabled:opacity-50"
      >
        <option value="">— Switch organization —</option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  )
}
