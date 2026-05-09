'use client'

import { Printer, Download } from 'lucide-react'
import { buildCsv } from '@/lib/csv'
import type { CsvColumn } from '@/lib/csv'

interface Props {
  filename: string
  csvRows: Record<string, unknown>[]
  csvColumns: CsvColumn[]
}

export function ReportExportButtons({ filename, csvRows, csvColumns }: Props) {
  function downloadCsv() {
    const csv  = buildCsv(csvRows, csvColumns)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="report-print-hide flex items-center gap-2">
      <button
        type="button"
        onClick={downloadCsv}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <Printer className="h-4 w-4" />
        Print / PDF
      </button>
    </div>
  )
}
