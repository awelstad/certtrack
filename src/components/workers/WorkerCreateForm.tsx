'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createWorker } from '@/app/actions/workers'

export function WorkerCreateForm() {
  const [state, formAction, pending] = useActionState(createWorker, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.workerId) router.push(`/workers/${state.workerId}`)
  }, [state, router])

  const field = (
    label: string,
    name: string,
    opts?: { type?: string; required?: boolean; placeholder?: string }
  ) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{opts?.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        type={opts?.type ?? 'text'}
        name={name}
        required={opts?.required}
        placeholder={opts?.placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </div>
  )

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {field('First Name', 'first_name', { required: true, placeholder: 'Jane' })}
        {field('Last Name',  'last_name',  { required: true, placeholder: 'Smith' })}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {field('Email', 'email', { type: 'email', placeholder: 'jane@example.com' })}
        {field('Phone', 'phone', { type: 'tel',   placeholder: '(555) 000-0000' })}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {field('Trade', 'trade', { placeholder: 'Ironworker, Electrician…' })}
        {field('Employer / Company', 'employer', { placeholder: 'ABC Contractors' })}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add Worker'}
        </button>
        <a
          href="/workers"
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
