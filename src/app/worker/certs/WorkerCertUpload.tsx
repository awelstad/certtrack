'use client'

import { useState, useTransition } from 'react'
import { submitWorkerCert } from '@/app/actions/workerCertUpload'
import { Upload, CheckCircle } from 'lucide-react'

export function WorkerCertUpload({
  workerId,
  orgId,
  certTypes,
}: {
  workerId: string
  orgId: string
  certTypes: { id: string; name: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fileName, setFileName] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    formData.set('worker_id', workerId)
    formData.set('org_id', orgId)

    startTransition(async () => {
      const result = await submitWorkerCert(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        ;(e.target as HTMLFormElement).reset()
        setFileName('')
      }
    })
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        <CheckCircle className="h-4 w-4 shrink-0" />
        Certification submitted — your manager will review it shortly.
        <button
          onClick={() => setSuccess(false)}
          className="ml-auto text-xs underline"
        >
          Upload another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Certification Type <span className="text-red-500">*</span></label>
        <select
          name="cert_type_id"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          <option value="">Select a cert type…</option>
          {certTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Issue Date</label>
          <input
            type="date"
            name="issue_date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
          <input
            type="date"
            name="expiry_date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Certificate Image / Document</label>
        <label className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-5 cursor-pointer hover:border-orange-400 transition-colors">
          <Upload className="h-5 w-5 text-slate-400" />
          <span className="text-sm text-slate-500">
            {fileName || 'Tap to select a photo or PDF'}
          </span>
          <input
            type="file"
            name="file"
            accept="image/*,.pdf"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Submitting…' : 'Submit for Review'}
      </button>
    </form>
  )
}
