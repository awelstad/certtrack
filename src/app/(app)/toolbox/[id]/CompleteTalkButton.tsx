'use client'

import { useState } from 'react'
import { completeTalk } from '@/app/actions/toolboxTalk'
import { CheckCircle2, Loader2 } from 'lucide-react'

export function CompleteTalkButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  async function handle() {
    setLoading(true)
    await completeTalk(id)
    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-700">
      <CheckCircle2 className="h-4 w-4" /> Completed
    </span>
  )

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      Mark Complete
    </button>
  )
}
