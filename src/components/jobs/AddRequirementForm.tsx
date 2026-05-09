'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { addJobRequirement } from '@/app/actions/jobs'

interface Props {
  jobId: string
  availableCertTypes: Array<{ id: string; name: string }>
}

export function AddRequirementForm({ jobId, availableCertTypes }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!availableCertTypes.length) return null

  function handleAdd() {
    if (!selectedId) return
    setError(null)
    startTransition(async () => {
      const res = await addJobRequirement(jobId, selectedId)
      if (res?.error) setError(res.error)
      else setSelectedId('')
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Add Requirement</h3>
      <div className="flex gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Select certification type…</option>
          {availableCertTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!selectedId || isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
