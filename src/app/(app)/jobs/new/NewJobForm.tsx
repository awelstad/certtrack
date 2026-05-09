'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createJob } from '@/app/actions/jobs'
import { Loader2 } from 'lucide-react'

const JOB_STATUSES = ['active', 'on_hold', 'completed', 'cancelled'] as const

export function NewJobForm() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createJob, null)

  useEffect(() => {
    if (state?.jobId) router.push(`/jobs/${state.jobId}`)
  }, [state?.jobId, router])

  return (
    <form action={formAction} className="space-y-5">
      {/* Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Job Name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          required
          placeholder="Downtown Office Tower"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Address */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Street Address</label>
        <input
          name="address"
          placeholder="123 Main St"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* City / State / Zip */}
      <div className="grid grid-cols-6 gap-4">
        <div className="col-span-3">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
          <input
            name="city"
            placeholder="Chicago"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">State</label>
          <input
            name="state"
            placeholder="IL"
            maxLength={2}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="col-span-1">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Zip</label>
          <input
            name="zip"
            placeholder="60601"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
        <select
          name="status"
          defaultValue="active"
          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Start Date</label>
          <input
            type="date"
            name="startDate"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">End Date</label>
          <input
            type="date"
            name="endDate"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Job
        </button>
      </div>
    </form>
  )
}
