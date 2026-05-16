'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateInspection } from '@/app/actions/equipment'
import { JhaSignaturePad } from '@/components/jha/JhaSignaturePad'
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  XCircle,
  ChevronDown,
} from 'lucide-react'
import type { ChecklistItem } from '@/lib/equipment'

interface Props {
  inspectionId: string
  equipmentId: string
  templateTitle: string | null
  initialItems: ChecklistItem[]
  initialInspectorName: string
  initialInspectorSignature: string | null
  initialInspectionDate: string
  initialNotes: string
}

type ItemResult = 'pass' | 'fail' | 'na' | null

export function EquipmentInspectionEditForm({
  inspectionId,
  equipmentId,
  templateTitle,
  initialItems,
  initialInspectorName,
  initialInspectorSignature,
  initialInspectionDate,
  initialNotes,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [items, setItems] = useState<ChecklistItem[]>(initialItems)
  const [inspectorName, setInspectorName] = useState(initialInspectorName)
  const [inspectorSignature, setInspectorSignature] = useState<string | null>(initialInspectorSignature)
  const [inspectionDate, setInspectionDate] = useState(initialInspectionDate)
  const [notes, setNotes] = useState(initialNotes)
  const [showDetails, setShowDetails] = useState(true)

  function setResult(id: string, result: ItemResult) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, result } : it))
  }

  function setNote(id: string, note: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, note } : it))
  }

  const answeredCount = items.filter((it) => it.result !== null).length
  const totalCount    = items.length
  const allAnswered   = totalCount === 0 || answeredCount === totalCount
  const hasCriticalFail = items.some((it) => it.is_critical && it.result === 'fail')
  const progressPct  = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0

  function handleSubmit() {
    setError(null)
    if (!inspectorName.trim()) { setError('Enter inspector name before saving.'); return }
    if (!allAnswered) {
      setError(`${totalCount - answeredCount} item${totalCount - answeredCount !== 1 ? 's' : ''} still need a response.`)
      return
    }

    const fd = new FormData()
    fd.set('inspectionId', inspectionId)
    fd.set('equipmentId', equipmentId)
    fd.set('inspectorName', inspectorName)
    fd.set('inspectorSignature', inspectorSignature ?? '')
    fd.set('inspectionDate', inspectionDate)
    fd.set('notes', notes)
    fd.set('results', JSON.stringify(items))

    startTransition(async () => {
      const res = await updateInspection(null, fd)
      if (res.error) {
        setError(res.error)
      } else {
        router.push(`/equipment/${equipmentId}/inspections/${inspectionId}`)
        router.refresh()
      }
    })
  }

  return (
    <div className="pb-28">
      {templateTitle && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
          <p className="text-xs font-medium text-slate-500">Template</p>
          <p className="text-sm font-semibold text-slate-800">{templateTitle}</p>
        </div>
      )}

      {hasCriticalFail && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
          <XCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-semibold text-red-800">
            Critical failure detected — saving will mark equipment Out of Service.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">
                {answeredCount} / {totalCount} answered
              </span>
              {allAnswered && (
                <span className="flex items-center gap-1 font-semibold text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  All done
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={[
                  'h-2 rounded-full transition-all duration-300',
                  hasCriticalFail ? 'bg-red-500' : allAnswered ? 'bg-green-500' : 'bg-orange-400',
                ].join(' ')}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {items.map((item, idx) => {
              const isCriticalFail = item.is_critical && item.result === 'fail'
              return (
                <li
                  key={item.id}
                  className={['px-4 py-4', isCriticalFail ? 'bg-red-50' : ''].join(' ')}
                >
                  <div className="mb-3 flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-base font-medium leading-snug text-slate-900">{item.label}</p>
                      {item.is_critical && (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-orange-600">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          Critical — fail triggers Out of Service
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(['pass', 'fail', 'na'] as const).map((r) => {
                      const selected = item.result === r
                      const colors = {
                        pass: selected
                          ? 'border-green-500 bg-green-500 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 active:bg-green-50',
                        fail: selected
                          ? 'border-red-500 bg-red-500 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 active:bg-red-50',
                        na: selected
                          ? 'border-slate-500 bg-slate-500 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-400 active:bg-slate-50',
                      }[r]
                      const labels = { pass: '✓  Pass', fail: '✗  Fail', na: '—  N/A' }
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setResult(item.id, r)}
                          className={[
                            'rounded-xl border py-4 text-base font-bold transition-colors select-none',
                            colors,
                          ].join(' ')}
                        >
                          {labels[r]}
                        </button>
                      )
                    })}
                  </div>

                  {item.result === 'fail' && (
                    <div className="mt-3">
                      <input
                        value={item.note}
                        onChange={(e) => setNote(item.id, e.target.value)}
                        placeholder="Describe the issue (optional)…"
                        className={[
                          'w-full rounded-xl border px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400',
                          'focus:outline-none focus:ring-2',
                          isCriticalFail
                            ? 'border-red-300 bg-white focus:ring-red-400'
                            : 'border-yellow-300 bg-yellow-50 focus:ring-yellow-400',
                        ].join(' ')}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Inspector details &amp; notes
          <ChevronDown className={['h-4 w-4 text-slate-400 transition-transform', showDetails ? 'rotate-180' : ''].join(' ')} />
        </button>

        {showDetails && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Inspector name <span className="text-red-500">*</span>
                </label>
                <input
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional observations…"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Signature</label>
              {inspectorSignature && (
                <div className="mb-3">
                  <p className="mb-1 text-xs text-slate-500">Current signature</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inspectorSignature}
                    alt="Current signature"
                    className="h-12 max-w-xs border-b border-slate-200 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setInspectorSignature(null)}
                    className="mt-1 text-xs text-red-500 hover:underline"
                  >
                    Clear &amp; re-sign
                  </button>
                </div>
              )}
              {!inspectorSignature && (
                <JhaSignaturePad onChange={setInspectorSignature} />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-4 py-3 lg:left-64">
        {error && (
          <p className="mb-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
        )}
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <div className="flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={[
                    'h-1.5 rounded-full transition-all',
                    hasCriticalFail ? 'bg-red-500' : allAnswered ? 'bg-green-500' : 'bg-orange-400',
                  ].join(' ')}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{answeredCount}/{totalCount} items</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className={[
              'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50',
              hasCriticalFail
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-orange-500 hover:bg-orange-600',
            ].join(' ')}
          >
            {pending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : hasCriticalFail
              ? <XCircle className="h-4 w-4" />
              : <CheckCircle2 className="h-4 w-4" />
            }
            {pending
              ? 'Saving…'
              : hasCriticalFail
              ? 'Save — Tag Out of Service'
              : 'Save Changes'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
