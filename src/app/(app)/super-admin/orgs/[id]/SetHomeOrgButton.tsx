'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'
import { setHomeOrg } from '@/app/actions/platform'

export function SetHomeOrgButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSet() {
    if (!confirm(`Make "${orgName}" your permanent home organization?\n\nYour admin profile will move to this org.`)) return
    startTransition(async () => {
      await setHomeOrg(orgId)
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleSet}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50"
    >
      <Home className="h-4 w-4" />
      {pending ? 'Switching…' : 'Set as My Home Org'}
    </button>
  )
}
