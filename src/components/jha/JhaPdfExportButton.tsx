'use client'

import { useTransition } from 'react'
import { Printer } from 'lucide-react'
import { logJhaPdfExport } from '@/app/actions/jha'

export function JhaPdfExportButton({ jhaId }: { jhaId: string }) {
  const [, startTransition] = useTransition()

  function handlePrint() {
    startTransition(async () => {
      await logJhaPdfExport(jhaId)
    })
    window.print()
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="jha-print-hide inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
    >
      <Printer className="h-4 w-4" />
      Print / Save PDF
    </button>
  )
}
