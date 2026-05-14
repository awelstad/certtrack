'use client'

import { useState } from 'react'
import { Printer, CheckSquare, Square } from 'lucide-react'

interface Equipment {
  id: string
  public_id: string
  name: string
  make: string | null
  model: string | null
  company_asset_number: string | null
}

const PRINT_STYLE = `
  @media print {
    .print-hide { display: none !important; }
    body { background: white; margin: 0; }
    .sticker-grid {
      display: grid !important;
      grid-template-columns: repeat(3, 2in) !important;
      gap: 0.25in !important;
      padding: 0 !important;
    }
    .sticker-card {
      width: 2in !important;
      height: 2in !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      overflow: hidden !important;
    }
  }
  @page { margin: 0.5in; size: letter; }
`

export function EquipmentQrPrint({ equipment, host }: { equipment: Equipment[]; host: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(equipment.map((e) => e.id)))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const allSelected = selected.size === equipment.length
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(equipment.map((e) => e.id)))

  const toPrint = equipment.filter((e) => selected.has(e.id))

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
        <span className="text-sm text-slate-500">{selected.size} of {equipment.length} selected</span>
        <button
          onClick={() => window.print()}
          disabled={selected.size === 0}
          className="ml-auto flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
        >
          <Printer className="h-4 w-4" />
          Print {selected.size > 0 ? `${selected.size} Label${selected.size !== 1 ? 's' : ''}` : ''}
        </button>
      </div>

      {/* Equipment selection list */}
      <div className="print-hide mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {equipment.map((e) => {
          const on = selected.has(e.id)
          return (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                on ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                on ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {e.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{e.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {[e.make, e.model].filter(Boolean).join(' ') || 'No make/model'}
                </p>
                {e.company_asset_number && (
                  <p className="truncate text-xs text-slate-400">Asset #{e.company_asset_number}</p>
                )}
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
      <div className="sticker-grid hidden print:grid">
        {toPrint.map((e) => {
          const eqUrl = `https://${host}/eq/${e.public_id}`
          const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(eqUrl)}&margin=4&color=0f172a`
          return (
            <div
              key={e.id}
              className="sticker-card flex flex-col items-center justify-center gap-1.5 rounded border border-slate-300 bg-white p-2 text-center"
            >
              <p className="text-[11px] font-bold leading-tight text-slate-900 truncate w-full">{e.name}</p>
              {(e.make || e.model) && (
                <p className="text-[9px] leading-tight text-slate-500 truncate w-full">
                  {[e.make, e.model].filter(Boolean).join(' ')}
                </p>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="QR" width={120} height={120} className="rounded" />
              {e.company_asset_number && (
                <p className="text-[9px] font-medium text-slate-500">Asset #{e.company_asset_number}</p>
              )}
              <p className="text-[8px] text-slate-400">Scan to view equipment record</p>
            </div>
          )
        })}
      </div>

      {toPrint.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">Select equipment above to preview their labels.</p>
      )}
    </>
  )
}
