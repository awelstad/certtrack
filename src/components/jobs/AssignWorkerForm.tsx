'use client'

import { useState, useTransition } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import { assignWorkerToJob } from '@/app/actions/jobs'

interface Props {
  jobId: string
  availableWorkers: Array<{ id: string; first_name: string; last_name: string; trade: string | null }>
}

export function AssignWorkerForm({ jobId, availableWorkers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!availableWorkers.length) return null

  function handleAssign() {
    if (!selectedId) return
    setError(null)
    startTransition(async () => {
      const res = await assignWorkerToJob(jobId, selectedId)
      if (res?.error) setError(res.error)
      else setSelectedId('')
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Assign Worker</h3>
      <div className="flex gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Select worker…</option>
          {availableWorkers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.first_name} {w.last_name}{w.trade ? ` — ${w.trade}` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={handleAssign}
          disabled={!selectedId || isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Assign
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
