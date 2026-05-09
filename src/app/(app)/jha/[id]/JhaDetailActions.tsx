'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeJha, requestRevision, duplicateJha } from '@/app/actions/jha'
import { CheckCircle2, Copy, RotateCcw, Loader2 } from 'lucide-react'

interface Props {
  jhaId: string
  status: string
}

export function JhaDetailActions({ jhaId, status }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleComplete() {
    startTransition(async () => {
      await completeJha(jhaId)
    })
  }

  function handleRevision() {
    startTransition(async () => {
      const res = await requestRevision(jhaId)
      if (res.jhaId) router.push(`/jha/${res.jhaId}/edit`)
    })
  }

  function handleDuplicate() {
    startTransition(async () => {
      const res = await duplicateJha(jhaId)
      if (res.jhaId) router.push(`/jha/${res.jhaId}/edit`)
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {pending && <Loader2 className="h-4 w-4 animate-spin text-slate-400 self-center" />}

      {status !== 'completed' && status !== 'archived' && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Mark Complete
        </button>
      )}

      {status === 'completed' && (
        <button
          type="button"
          onClick={handleRevision}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Request Revision
        </button>
      )}

      <button
        type="button"
        onClick={handleDuplicate}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        <Copy className="h-4 w-4" />
        Duplicate
      </button>
    </div>
  )
}
