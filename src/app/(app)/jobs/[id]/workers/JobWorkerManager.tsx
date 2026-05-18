'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addWorkerToJob, removeWorkerFromJob } from '@/app/actions/jobWorkers'
import { UserPlus, UserMinus, Search } from 'lucide-react'

type WorkerRow = {
  id: string
  first_name: string
  last_name: string
  trade: string | null
  employer: string | null
  avatar_url: string | null
}

export function JobWorkerManager({
  jobId,
  assigned,
  available,
}: {
  jobId: string
  assigned: WorkerRow[]
  available: WorkerRow[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  function initials(w: WorkerRow) {
    return `${w.first_name[0] ?? ''}${w.last_name[0] ?? ''}`.toUpperCase()
  }

  function Avatar({ w }: { w: WorkerRow }) {
    return w.avatar_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={w.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
    ) : (
      <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
        {initials(w)}
      </div>
    )
  }

  async function handleAdd(workerId: string) {
    setBusy(workerId)
    const res = await addWorkerToJob({ workerId, jobId })
    setBusy(null)
    if (!res.error) startTransition(() => router.refresh())
  }

  async function handleRemove(workerId: string) {
    setBusy(workerId)
    const res = await removeWorkerFromJob({ workerId, jobId })
    setBusy(null)
    if (!res.error) startTransition(() => router.refresh())
  }

  const filteredAvailable = available.filter((w) => {
    const q = search.toLowerCase()
    return (
      w.first_name.toLowerCase().includes(q) ||
      w.last_name.toLowerCase().includes(q) ||
      (w.trade ?? '').toLowerCase().includes(q) ||
      (w.employer ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Current roster */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            Current Roster
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
              {assigned.length}
            </span>
          </p>
        </div>
        {assigned.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No workers assigned yet. Add from the list below.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {assigned.map((w) => (
              <li key={w.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar w={w} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">
                    {w.first_name} {w.last_name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {[w.trade, w.employer].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(w.id)}
                  disabled={busy === w.id || pending}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-40"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add workers */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700 mb-2">Add from Organization</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, trade, or employer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
        {filteredAvailable.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-slate-400">
            {search ? 'No workers match your search.' : 'All organization workers are already on this roster.'}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {filteredAvailable.map((w) => (
              <li key={w.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar w={w} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">
                    {w.first_name} {w.last_name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {[w.trade, w.employer].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => handleAdd(w.id)}
                  disabled={busy === w.id || pending}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-40"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
