'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateJob } from '@/app/actions/jobs'
import { ArrowLeft } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active' },
  { value: 'on_hold',   label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

type Job = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  status: string
  start_date: string | null
  end_date: string | null
}

export function JobEditForm({ job }: { job: Job }) {
  const router = useRouter()

  const [state, action, pending] = useActionState(
    async (prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateJob(prev, formData)
      if (result.success) router.push(`/jobs/${job.id}?saved=1`)
      return result
    },
    null
  )

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl">
      <div className="mb-6">
        <Link href={`/jobs/${job.id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to job
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-slate-900">Edit {job.name}</h1>

      <form action={action} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <input type="hidden" name="job_id" value={job.id} />

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Job Name <span className="text-red-500">*</span></label>
          <input
            name="name"
            required
            defaultValue={job.name}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
          <input
            name="address"
            defaultValue={job.address ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">City</label>
            <input
              name="city"
              defaultValue={job.city ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">State</label>
            <select
              name="state"
              defaultValue={job.state ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              <option value="">—</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">ZIP</label>
            <input
              name="zip"
              defaultValue={job.zip ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Start Date</label>
            <input
              name="startDate"
              type="date"
              defaultValue={job.start_date ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">End Date</label>
            <input
              name="endDate"
              type="date"
              defaultValue={job.end_date ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select
            name="status"
            defaultValue={job.status}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</p>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save Changes'}
          </button>
          <Link href={`/jobs/${job.id}`} className="text-sm text-slate-500 hover:text-slate-900">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
