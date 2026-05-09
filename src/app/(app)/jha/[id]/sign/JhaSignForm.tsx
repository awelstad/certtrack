'use client'

import { useState, useTransition } from 'react'
import { addJhaSignature } from '@/app/actions/jha'
import { JhaSignaturePad } from '@/components/jha/JhaSignaturePad'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface Worker { id: string; first_name: string; last_name: string; trade: string | null }

interface Props {
  jhaId: string
  workers: Worker[]
}

export function JhaSignForm({ jhaId, workers }: Props) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [printedName,      setPrintedName]      = useState('')
  const [workerIdentifier, setWorkerIdentifier] = useState('')
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [signatureData,    setSignatureData]    = useState<string | null>(null)

  // Pre-fill name when a worker is selected
  function handleWorkerSelect(wid: string) {
    setSelectedWorkerId(wid)
    const w = workers.find((x) => x.id === wid)
    if (w) setPrintedName(`${w.first_name} ${w.last_name}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!printedName.trim()) {
      setError('Please enter your printed name.')
      return
    }

    startTransition(async () => {
      const res = await addJhaSignature(jhaId, {
        printed_name:     printedName,
        signature_data:   signatureData,
        worker_id:        selectedWorkerId || null,
        worker_identifier: workerIdentifier,
      })
      if (res.error) {
        setError(res.error)
      } else {
        setDone(true)
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" />
        <p className="text-lg font-semibold text-green-900">Signed successfully!</p>
        <p className="mt-1 text-sm text-green-700">Your signature has been recorded. You may close this page.</p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-5 text-sm text-green-600 hover:text-green-800 underline"
        >
          Add another signature
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Worker select */}
      {workers.length > 0 && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Select your name <span className="text-slate-400">(optional)</span>
          </label>
          <select
            value={selectedWorkerId}
            onChange={(e) => handleWorkerSelect(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">— Select worker or enter manually below —</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.first_name} {w.last_name}{w.trade ? ` (${w.trade})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Printed name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Print Full Name <span className="text-red-500">*</span>
        </label>
        <input
          value={printedName}
          onChange={(e) => setPrintedName(e.target.value)}
          required
          placeholder="Your full name"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Worker ID */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Employee / Badge ID <span className="text-slate-400">(optional)</span>
        </label>
        <input
          value={workerIdentifier}
          onChange={(e) => setWorkerIdentifier(e.target.value)}
          placeholder="e.g. EMP-1234"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Signature pad */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Signature</label>
        <JhaSignaturePad onChange={setSignatureData} />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Signing…' : 'Sign & Acknowledge'}
      </button>
    </form>
  )
}
