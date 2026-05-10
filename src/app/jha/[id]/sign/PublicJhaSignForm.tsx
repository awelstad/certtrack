'use client'

import { useState, useTransition } from 'react'
import { addJhaSignaturePublic } from './action'
import { JhaSignaturePad } from '@/components/jha/JhaSignaturePad'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  jhaId: string
}

export function PublicJhaSignForm({ jhaId }: Props) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [printedName, setPrintedName] = useState('')
  const [workerIdentifier, setWorkerIdentifier] = useState('')
  const [signatureData, setSignatureData] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!printedName.trim()) {
      setError('Please enter your full name.')
      return
    }
    startTransition(async () => {
      const res = await addJhaSignaturePublic(jhaId, {
        printed_name: printedName,
        signature_data: signatureData,
        worker_identifier: workerIdentifier || null,
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
      <div className="rounded-xl border border-green-200 bg-green-50 p-10 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
        <p className="text-xl font-semibold text-green-900">Signed!</p>
        <p className="mt-2 text-sm text-green-700">Your signature has been recorded. You may close this page.</p>
        <button
          type="button"
          onClick={() => { setDone(false); setPrintedName(''); setWorkerIdentifier(''); setSignatureData(null) }}
          className="mt-6 text-sm text-green-600 underline hover:text-green-800"
        >
          Add another signature
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          value={printedName}
          onChange={(e) => setPrintedName(e.target.value)}
          required
          placeholder="Your full name"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

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
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Signing…' : 'Sign & Acknowledge'}
      </button>
    </form>
  )
}
