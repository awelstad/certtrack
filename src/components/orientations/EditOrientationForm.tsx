'use client'

import { useActionState, useState } from 'react'
import { updateOrientation } from '@/app/actions/orientations'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Job {
  id: string
  name: string
}

interface Props {
  orientationId: string
  initialTitle: string
  initialContent: string | null
  initialJobId: string | null
  initialIsRequired: boolean
  initialIncludeInCompliance: boolean
  jobs: Job[]
}

export function EditOrientationForm({
  orientationId,
  initialTitle,
  initialContent,
  initialJobId,
  initialIsRequired,
  initialIncludeInCompliance,
  jobs,
}: Props) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(updateOrientation, null)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-700">Edit Orientation</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <form action={formAction} className="border-t border-slate-100 p-6 space-y-4">
          <input type="hidden" name="id" value={orientationId} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
            <input
              name="title"
              required
              defaultValue={initialTitle}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Job Site</label>
            <select
              name="jobId"
              defaultValue={initialJobId ?? ''}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Org-wide (all workers)</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Content</label>
            <textarea
              name="content"
              rows={10}
              defaultValue={initialContent ?? ''}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isRequired"
                defaultChecked={initialIsRequired}
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
                defaultChecked={initialIncludeInCompliance}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-700">Include in job compliance</p>
                <p className="text-xs text-slate-500">Unsigned workers appear as Not Cleared on the compliance dashboard.</p>
              </div>
            </label>
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
          )}
          {state && !state.error && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">Saved successfully.</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
