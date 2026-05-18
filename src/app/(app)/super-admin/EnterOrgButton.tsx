'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { switchToOrg } from '@/app/actions/platform'

export function EnterOrgButton({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleEnter() {
    startTransition(async () => {
      await switchToOrg(orgId)
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleEnter}
      disabled={pending}
      title="Enter this org as admin"
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50"
    >
      <LogIn className="h-3 w-3" />
      {pending ? 'Entering…' : 'Enter'}
    </button>
  )
}
