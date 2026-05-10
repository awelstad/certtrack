'use client'

import { useState } from 'react'
import { Printer, CheckSquare, Square } from 'lucide-react'

interface Worker {
  id: string
  public_id: string
  first_name: string
  last_name: string
  trade: string | null
  employer: string | null
  status: string
}

const PRINT_STYLE = `
  @media print {
    .print-hide { display: none !important; }
    body { background: white; margin: 0; }
    .badge-grid {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 12px !important;
      padding: 12px !important;
    }
    .badge-card { break-inside: avoid; page-break-inside: avoid; }
  }
  @page { margin: 1cm; size: letter; }
`

export function BulkBadgePrint({ workers, host }: { workers: Worker[]; host: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(workers.map((w) => w.id)))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const allSelected = selected.size === workers.length
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(workers.map((w) => w.id)))

  const toPrint = workers.filter((w) => selected.has(w.id))

  return (
    <>
      <style>{PRINT_STYLE}</style>

      {/* Controls */}
      <div className="print-hide mb-5 flex flex-wrap items-center gap-3">
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {allSelected
            ? <><CheckSquare className="h-4 w-4 text-orange-500" /> Deselect all</>
            : <><Square className="h-4 w-4 text-slate-400" /> Select all</>
          }
        </button>
        <span className="text-sm text-slate-500">{selected.size} of {workers.length} selected</span>
        <button
          onClick={() => window.print()}
          disabled={selected.size === 0}
          className="ml-auto flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
        >
          <Printer className="h-4 w-4" />
          Print {selected.size > 0 ? `${selected.size} Badge${selected.size !== 1 ? 's' : ''}` : ''}
        </button>
      </div>

      {/* Worker selection list (screen only) */}
      <div className="print-hide mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((w) => {
          const on = selected.has(w.id)
          return (
            <button
              key={w.id}
              onClick={() => toggle(w.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                on
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                on ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {w.first_name[0]}{w.last_name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {w.first_name} {w.last_name}
                </p>
                <p className="truncate text-xs text-slate-500">{w.trade ?? 'No trade'}</p>
              </div>
              {on
                ? <CheckSquare className="h-4 w-4 shrink-0 text-orange-500" />
                : <Square className="h-4 w-4 shrink-0 text-slate-300" />
              }
            </button>
          )
        })}
      </div>

      {/* Print layout — always rendered, only visible when printing */}
      <div className="badge-grid hidden print:grid">
        {toPrint.map((w) => {
          const workerUrl = `https://${host}/qr/${w.public_id}`
          const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(workerUrl)}&margin=4&color=0f172a`
          return (
            <div
              key={w.id}
              className="badge-card flex flex-col items-center gap-2 rounded-xl border border-slate-300 bg-white p-4 text-center"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                {w.first_name[0]}{w.last_name[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{w.first_name} {w.last_name}</p>
                {w.trade && <p className="text-xs text-slate-500">{w.trade}</p>}
                {w.employer && <p className="text-xs text-slate-400">{w.employer}</p>}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="QR" width={120} height={120} className="rounded" />
              <p className="text-[10px] text-slate-400">Scan to verify certifications</p>
            </div>
          )
        })}
      </div>

      {toPrint.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">Select workers above to preview their badges.</p>
      )}
    </>
  )
}
