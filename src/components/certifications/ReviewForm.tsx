'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveCert, rejectCert, deleteCert } from '@/app/actions/certifications'
import { CheckCircle2, XCircle, Trash2, Loader2 } from 'lucide-react'
import type { CertStatus } from '@/lib/types'

interface Props {
  certId: string
  workerId: string
  currentStatus: CertStatus
  isManager: boolean
}

export function ReviewForm({ certId, workerId, currentStatus, isManager }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!isManager) return null

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const res = await approveCert(certId)
      if (res?.error) setError(res.error)
    })
  }

  function handleReject() {
    if (!reason.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await rejectCert(certId, reason.trim())
      if (res?.error) setError(res.error)
      else setShowReject(false)
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteCert(certId, workerId)
      if (res?.error) {
        setError(res.error)
        setConfirmDelete(false)
      } else {
        router.push(`/workers/${workerId}/certifications`)
      }
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">Admin Actions</h3>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-wrap gap-3">
        {currentStatus !== 'approved' && (
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve
          </button>
        )}

        {currentStatus !== 'rejected' && (
          <button
            onClick={() => setShowReject(!showReject)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        )}

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Sure?</span>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {showReject && (
        <div className="space-y-3 rounded-lg border border-red-100 bg-red-50 p-4">
          <label className="block text-sm font-medium text-red-800">Rejection reason (required)</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this certification was rejected…"
            className="w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={isPending || !reason.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Rejection
            </button>
            <button
              onClick={() => { setShowReject(false); setReason('') }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
