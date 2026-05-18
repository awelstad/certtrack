'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Calendar, Download } from 'lucide-react'

export function AttendanceDatePicker({
  jobId,
  from,
  to,
}: {
  jobId: string
  from: string
  to: string
}) {
  const router = useRouter()
  const [f, setF] = useState(from)
  const [t, setT] = useState(to)

  function apply(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/attendance/${jobId}?from=${f}&to=${t}`)
  }

  function setToday() {
    const today = new Date().toISOString().slice(0, 10)
    setF(today)
    setT(today)
    router.push(`/attendance/${jobId}?from=${today}&to=${today}`)
  }

  function setThisWeek() {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    const f = monday.toISOString().slice(0, 10)
    const t = now.toISOString().slice(0, 10)
    setF(f); setT(t)
    router.push(`/attendance/${jobId}?from=${f}&to=${t}`)
  }

  function setThisMonth() {
    const now = new Date()
    const f = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const t = now.toISOString().slice(0, 10)
    setF(f); setT(t)
    router.push(`/attendance/${jobId}?from=${f}&to=${t}`)
  }

  const isRange = f !== t
  const exportUrl = `/api/attendance/export?jobId=${jobId}&from=${f}&to=${t}`

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-700">Date Range</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={setToday}     className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Today</button>
        <button onClick={setThisWeek}  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">This Week</button>
        <button onClick={setThisMonth} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">This Month</button>
      </div>

      <form onSubmit={apply} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">From</label>
          <input
            type="date"
            value={f}
            onChange={(e) => setF(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">To</label>
          <input
            type="date"
            value={t}
            onChange={(e) => setT(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Apply
        </button>
        <a
          href={exportUrl}
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          {isRange ? 'Export CSV' : 'Export Day'}
        </a>
      </form>
    </div>
  )
}
