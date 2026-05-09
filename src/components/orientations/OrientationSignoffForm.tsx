'use client'

import { useState, useTransition } from 'react'
import { signOrientation } from '@/app/actions/orientations'
import { CheckCircle2, Loader2, PenLine } from 'lucide-react'

interface Props {
  orientationId: string
  alreadySigned: boolean
  signedAt?: string | null
}

export function OrientationSignoffForm({ orientationId, alreadySigned, signedAt }: Props) {
  const [pending, startTransition] = useTransition()
  const [signed, setSigned] = useState(alreadySigned)
  const [timestamp, setTimestamp] = useState<string | null>(signedAt ?? null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  if (signed) {
    const date = timestamp ? new Date(timestamp).toLocaleString() : 'just now'
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
        <div>
          <p className="text-sm font-semibold text-green-800">You have signed this orientation</p>
          <p className="text-xs text-green-600">Signed on {date}</p>
        </div>
      </div>
    )
  }

  function handleSign() {
    setError(null)
    startTransition(async () => {
      const result = await signOrientation(orientationId)
      if (result.error && result.error !== 'Already signed') {
        setError(result.error)
      } else {
        setSigned(true)
        setTimestamp(new Date().toISOString())
      }
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <PenLine className="h-5 w-5 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Sign & Acknowledge</h2>
      </div>

      <label className="flex items-start gap-3 cursor-pointer mb-5">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
        />
        <span className="text-sm text-slate-600">
          I confirm that I have read and understood the orientation content above, and I agree to comply
          with all rules and procedures described.
        </span>
      </label>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSign}
        disabled={pending || !confirmed}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Signing…' : 'Sign & Acknowledge'}
      </button>
    </div>
  )
}
