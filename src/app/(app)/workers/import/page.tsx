'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { importWorkers } from '@/app/actions/importWorkers'
import type { ImportRow, ImportResult } from '@/app/actions/importWorkers'
import { Upload, FileText, AlertTriangle, CheckCircle2, ArrowLeft, X, Download } from 'lucide-react'

// ── CSV parser ──────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    const cols: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cols.push(cur.trim())
    rows.push(cols)
  }
  return rows
}

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[\s_-]+/g, '_')
}

const COLUMN_ALIASES: Record<string, keyof ImportRow> = {
  first_name: 'first_name', firstname: 'first_name', first: 'first_name',
  last_name: 'last_name',  lastname: 'last_name',  last: 'last_name',
  trade: 'trade',
  employer: 'employer', company: 'employer',
  email: 'email', email_address: 'email',
  phone: 'phone', phone_number: 'phone', mobile: 'phone',
  status: 'status',
}

function csvToRows(raw: string): { rows: ImportRow[]; error?: string } {
  const grid = parseCSV(raw)
  if (grid.length < 2) return { rows: [], error: 'File appears empty or has no data rows.' }

  const headers = grid[0].map(normalizeHeader)
  const colMap: Partial<Record<keyof ImportRow, number>> = {}
  for (let i = 0; i < headers.length; i++) {
    const field = COLUMN_ALIASES[headers[i]]
    if (field) colMap[field] = i
  }

  if (colMap.first_name === undefined || colMap.last_name === undefined) {
    return { rows: [], error: 'CSV must have "First Name" and "Last Name" columns.' }
  }

  const rows: ImportRow[] = grid.slice(1).map(cols => ({
    first_name: cols[colMap.first_name!] ?? '',
    last_name:  cols[colMap.last_name!]  ?? '',
    trade:      colMap.trade     !== undefined ? (cols[colMap.trade]     ?? '') : '',
    employer:   colMap.employer  !== undefined ? (cols[colMap.employer]  ?? '') : '',
    email:      colMap.email     !== undefined ? (cols[colMap.email]     ?? '') : '',
    phone:      colMap.phone     !== undefined ? (cols[colMap.phone]     ?? '') : '',
    status:     colMap.status    !== undefined ? (cols[colMap.status]    ?? '') : 'active',
  }))

  return { rows }
}

// ── Template download ───────────────────────────────────────
function downloadTemplate() {
  const csv = 'First Name,Last Name,Trade,Employer,Email,Phone,Status\nJohn,Smith,Electrician,Fortune Electrical,john@example.com,555-1234,active'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'clearwork_workers_import.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── Component ───────────────────────────────────────────────
export default function WorkerImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows]         = useState<ImportRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<ImportResult | null>(null)

  function handleFile(file: File) {
    setResult(null)
    setParseError(null)
    setRows([])
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { rows: parsed, error } = csvToRows(text)
      if (error) { setParseError(error); return }
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function updateRow(i: number, field: keyof ImportRow, value: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleImport() {
    if (!rows.length) return
    setLoading(true)
    const res = await importWorkers(rows)
    setResult(res)
    setLoading(false)
    if (res.failed === 0) { setRows([]); setFileName(null) }
  }

  const hasData = rows.length > 0

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/workers" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Workers
        </Link>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Import Workers</h1>
        <p className="mt-1 text-sm text-slate-500">Upload a CSV file to add multiple workers at once. Review and fix any issues before importing.</p>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`mb-6 rounded-xl border p-4 ${result.failed === 0 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <div className="flex items-start gap-3">
            {result.failed === 0
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
            }
            <div className="flex-1">
              <p className="font-semibold text-slate-900">
                {result.imported > 0 && `${result.imported} worker${result.imported !== 1 ? 's' : ''} imported successfully.`}
                {result.failed > 0 && ` ${result.failed} row${result.failed !== 1 ? 's' : ''} failed.`}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-sm text-red-700">{e}</li>
                  ))}
                </ul>
              )}
              {result.imported > 0 && result.failed === 0 && (
                <Link href="/workers" className="mt-2 inline-block text-sm font-medium text-green-700 underline">
                  View workers →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {!hasData && (
        <>
          {/* Template download */}
          <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">Download template</p>
                <p className="text-xs text-slate-500">CSV with all supported columns pre-filled with an example row</p>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Template
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center transition-colors hover:border-orange-400 hover:bg-orange-50"
          >
            <Upload className="h-10 w-10 text-slate-300" />
            <div>
              <p className="font-semibold text-slate-700">Drop your CSV here, or click to browse</p>
              <p className="mt-1 text-sm text-slate-400">Supports .csv files · Required columns: First Name, Last Name</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleInput} />
          </div>

          {parseError && (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {parseError}
            </p>
          )}
        </>
      )}

      {/* Preview table */}
      {hasData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {rows.length} row{rows.length !== 1 ? 's' : ''} from <span className="font-mono text-slate-500">{fileName}</span>
            </p>
            <button
              onClick={() => { setRows([]); setFileName(null); setResult(null) }}
              className="text-sm text-slate-400 hover:text-red-500"
            >
              Clear
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['First Name','Last Name','Trade','Employer','Email','Phone','Status',''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={i} className={!row.first_name || !row.last_name ? 'bg-red-50' : ''}>
                    {(['first_name','last_name','trade','employer','email','phone','status'] as (keyof ImportRow)[]).map(field => (
                      <td key={field} className="px-1 py-1">
                        <input
                          value={row[field]}
                          onChange={e => updateRow(i, field, e.target.value)}
                          className={`w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 ${
                            (field === 'first_name' || field === 'last_name') && !row[field]
                              ? 'border-red-300 bg-red-50'
                              : 'border-transparent bg-transparent hover:border-slate-200'
                          }`}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">You can edit any cell before importing. Red cells are required.</p>
            <button
              onClick={handleImport}
              disabled={loading || rows.some(r => !r.first_name || !r.last_name)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Importing…' : `Import ${rows.length} Worker${rows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Column reference */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Supported Columns</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { col: 'First Name', note: 'Required', req: true },
            { col: 'Last Name',  note: 'Required', req: true },
            { col: 'Trade',      note: 'e.g. Electrician, Foreman', req: false },
            { col: 'Employer',   note: 'Company name', req: false },
            { col: 'Email',      note: 'Worker email address', req: false },
            { col: 'Phone',      note: 'Worker phone number', req: false },
            { col: 'Status',     note: 'active, inactive, or suspended (default: active)', req: false },
          ].map(({ col, note, req }) => (
            <div key={col} className="flex items-start gap-2 text-xs">
              <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono font-medium ${req ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{col}</span>
              <span className="text-slate-500">{note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
