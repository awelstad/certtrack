'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateWorker } from '@/app/actions/workers'
import { ArrowLeft } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active' },
  { value: 'inactive',  label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
]

const TRADE_OPTIONS = [
  'Electrician', 'Plumber', 'Carpenter', 'Ironworker', 'Welder',
  'Pipefitter', 'HVAC Tech', 'Concrete Worker', 'Laborer', 'Equipment Operator',
  'Painter', 'Roofer', 'Mason', 'Millwright', 'Boilermaker', 'Other',
]

type Worker = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  trade: string | null
  employer: string | null
  status: string
}

export function WorkerEditForm({ worker }: { worker: Worker }) {
  const router = useRouter()

  const [state, action, pending] = useActionState(
    async (prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateWorker(prev, formData)
      if (result.success) router.push(`/workers/${worker.id}`)
      return result
    },
    null
  )

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/workers/${worker.id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to worker
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-slate-900">
        Edit {worker.first_name} {worker.last_name}
      </h1>

      <form action={action} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <input type="hidden" name="worker_id" value={worker.id} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">First Name <span className="text-red-500">*</span></label>
            <input
              name="first_name"
              required
              defaultValue={worker.first_name}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Last Name <span className="text-red-500">*</span></label>
            <input
              name="last_name"
              required
              defaultValue={worker.last_name}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={worker.email ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
            <input
              name="phone"
              type="tel"
              defaultValue={worker.phone ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Trade</label>
            <select
              name="trade"
              defaultValue={worker.trade ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              <option value="">— Select trade —</option>
              {TRADE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Employer / Company</label>
            <input
              name="employer"
              defaultValue={worker.employer ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select
            name="status"
            defaultValue={worker.status}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
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
          <Link
            href={`/workers/${worker.id}`}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
