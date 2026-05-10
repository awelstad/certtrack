'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type CertEvent = {
  id: string
  expiry_date: string
  worker_id: string
  worker_name: string
  cert_name: string
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function todayStr() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
}

function chipStyle(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(dateStr + 'T00:00:00')
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return 'bg-red-100 text-red-700 border border-red-200'
  if (diff <= 30) return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
  return 'bg-green-100 text-green-700 border border-green-200'
}

function monthSummary(events: CertEvent[], year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2,'0')}`
  const me = events.filter(e => e.expiry_date.startsWith(prefix))
  const today = new Date(); today.setHours(0,0,0,0)
  let expired = 0, soon = 0, ok = 0
  for (const e of me) {
    const d = new Date(e.expiry_date + 'T00:00:00')
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
    if (diff < 0) expired++
    else if (diff <= 30) soon++
    else ok++
  }
  return { expired, soon, ok, total: me.length }
}

export function CalendarView({ events }: { events: CertEvent[] }) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const eventMap = useMemo(() => {
    const map = new Map<string, CertEvent[]>()
    for (const e of events) {
      if (!map.has(e.expiry_date)) map.set(e.expiry_date, [])
      map.get(e.expiry_date)!.push(e)
    }
    return map
  }, [events])

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const days = useMemo(() => {
    const startDow  = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    const arr: (number | null)[] = []
    for (let i = 0; i < startDow; i++) arr.push(null)
    for (let d = 1; d <= totalDays; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [year, month])

  const today = todayStr()
  const { expired, soon, ok, total } = monthSummary(events, year, month)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Expiry Calendar</h1>
          <p className="mt-0.5 text-sm text-slate-500">Click any cert to open that worker's profile.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </button>
          <span className="w-40 text-center text-sm font-semibold text-slate-900">
            {MONTHS[month]} {year}
          </span>
          <button onClick={next} className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-50">
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Month summary pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {total === 0 && <span className="text-sm text-slate-400">No cert expirations this month.</span>}
        {expired > 0 && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">{expired} expired</span>}
        {soon > 0    && <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">{soon} expiring within 30 days</span>}
        {ok > 0      && <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">{ok} future</span>}
      </div>

      {/* Grid */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {DOW.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {days.map((day, i) => {
            if (day === null) {
              return <div key={`pad-${i}`} className="min-h-[88px] bg-slate-50/60 p-1" />
            }

            const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const dayEvents = eventMap.get(dateStr) ?? []
            const isToday = dateStr === today
            const isPast  = dateStr < today

            return (
              <div
                key={dateStr}
                className={[
                  'min-h-[88px] p-1 sm:p-1.5',
                  isToday ? 'bg-orange-50' : isPast ? 'bg-slate-50/60' : 'bg-white',
                ].join(' ')}
              >
                {/* Day number */}
                <div className={[
                  'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  isToday ? 'bg-orange-500 text-white' : isPast ? 'text-slate-400' : 'text-slate-700',
                ].join(' ')}>
                  {day}
                </div>

                {/* Cert chips */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(ev => (
                    <Link
                      key={ev.id}
                      href={`/workers/${ev.worker_id}`}
                      title={`${ev.worker_name} — ${ev.cert_name}`}
                      className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight hover:opacity-75 ${chipStyle(ev.expiry_date)}`}
                    >
                      <span className="sm:hidden">{ev.worker_name.split(' ')[0]}</span>
                      <span className="hidden sm:inline">{ev.worker_name.split(' ')[0]} · {ev.cert_name}</span>
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="pl-1 text-[10px] font-medium text-slate-400">+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-200 border border-red-300" /> Expired</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-200 border border-yellow-300" /> Expiring within 30 days</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-200 border border-green-300" /> More than 30 days out</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" /> Today</span>
      </div>
    </div>
  )
}
