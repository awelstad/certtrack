'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { seedDefaultCertTypes } from '@/app/actions/certifications'

export function SeedCertTypesButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSeed() {
    startTransition(async () => {
      const result = await seedDefaultCertTypes()
      if (result.error) alert(result.error)
      else if (result.added === 0) alert('All standard types are already added.')
      else {
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handleSeed}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
    >
      <Sparkles className="h-3.5 w-3.5 text-orange-400" />
      {pending ? 'Adding…' : 'Add Standard Types'}
    </button>
  )
}
