'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOrientation } from '@/app/actions/orientations'
import { Loader2 } from 'lucide-react'

interface Job {
  id: string
  name: string
}

interface Props {
  jobs: Job[]
}

export function NewOrientationForm({ jobs }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createOrientation, null)

  useEffect(() => {
    if (state?.orientationId) {
      router.push(`/orientations/${state.orientationId}`)
    }
  }, [state?.orientationId, router])

  return (
    <form action={formAction} className="space-y-6">
      {/* Title */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Orientation Details</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              required
              placeholder="e.g. Site Safety Orientation — Phase 2"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Job Site <span className="text-slate-400">(optional — leave blank for all workers)</span>
            </label>
            <select
              name="jobId"
              defaultValue=""
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Org-wide (all workers)</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Orientation Content</h2>
        <p className="mb-4 text-xs text-slate-500">
          Paste rules, safety procedures, video links, or any content workers must review before signing.
        </p>
        <textarea
          name="content"
          rows={12}
          placeholder="Enter the orientation document, safety rules, acknowledgement text, or video URLs here…"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Options */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Options</h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isRequired"
              defaultChecked
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-700">Required</p>
              <p className="text-xs text-slate-500">Workers must sign before starting work.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="includeInCompliance"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-700">Include in job compliance</p>
              <p className="text-xs text-slate-500">
                Unsigned workers will appear as Not Cleared on the job compliance dashboard.
              </p>
            </div>
          </label>
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end gap-3">
        <a
          href="/orientations"
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Orientation
        </button>
      </div>
    </form>
  )
}
