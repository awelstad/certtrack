'use client'

import { useActionState } from 'react'
import { inviteSubcontractor } from '@/app/actions/subcontractors'
import { Mail } from 'lucide-react'

export function SubInviteForm({
  jobId,
  jobs,
}: {
  jobId?: string
  jobs: { id: string; name: string }[]
}) {
  const [state, action, pending] = useActionState(inviteSubcontractor, null)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Mail className="h-4 w-4 text-orange-500" />
        <h2 className="font-semibold text-slate-900">Invite Subcontractor</h2>
      </div>

      <form action={action} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Company Name *</label>
          <input
            name="company_name"
            required
            placeholder="ABC Electrical"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contact Email *</label>
          <input
            name="email"
            type="email"
            required
            placeholder="foreman@abcelectrical.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Assign to Job</label>
          <select
            name="job_id"
            defaultValue={jobId ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="">— No specific job —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
        </div>

        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-green-600">Invite sent! They will receive an email to set up their account.</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Sending…' : 'Send Invite Email'}
        </button>
      </form>
    </div>
  )
}
