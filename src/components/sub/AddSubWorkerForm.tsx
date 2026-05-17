'use client'

import { useActionState } from 'react'
import { addSubWorker } from '@/app/actions/subcontractors'
import { UserPlus } from 'lucide-react'

export function AddSubWorkerForm() {
  const [state, action, pending] = useActionState(addSubWorker, null)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <UserPlus className="h-4 w-4 text-orange-500" />
        <h2 className="font-semibold text-slate-900">Add Worker</h2>
      </div>

      <form action={action} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">First Name *</label>
            <input
              name="first_name"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Last Name *</label>
            <input
              name="last_name"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Trade / Craft</label>
          <input
            name="trade"
            placeholder="e.g. Electrician, Carpenter"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input
            name="email"
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
          <input
            name="phone"
            type="tel"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-green-600">Worker added successfully.</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Adding…' : 'Add Worker'}
        </button>
      </form>
    </div>
  )
}
