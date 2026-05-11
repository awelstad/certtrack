'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Printer, ChevronDown, HardHat, Wrench, IdCard } from 'lucide-react'

const options = [
  {
    href:  '/workers/badges',
    label: 'Worker Badges',
    sub:   'Full ID card with cert status',
    icon:  IdCard,
  },
  {
    href:  '/workers/print/hardhat-qr',
    label: 'Hardhat QR Sticker',
    sub:   '2″ × 2″ — worker QR for hardhat',
    icon:  HardHat,
  },
  {
    href:  '/workers/print/equipment-qr',
    label: 'Equipment QR Sticker',
    sub:   '3″ × 3″ — Avery label for equipment',
    icon:  Wrench,
  },
]

export function PrintMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:px-4"
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Print</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {options.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                <o.icon className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{o.label}</p>
                <p className="text-xs text-slate-400">{o.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
