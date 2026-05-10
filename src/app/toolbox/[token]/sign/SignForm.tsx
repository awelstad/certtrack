'use client'

import { useActionState, useEffect, useState } from 'react'
import { signToolboxTalk } from './action'
import { CheckCircle2, Loader2, PenLine } from 'lucide-react'

export function SignForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(signToolboxTalk, null)
  const [showForm, setShowForm] = useState(true)

  useEffect(() => {
    if (state?.success) setShowForm(false)
  }, [state])

  if (!showForm && state?.success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
        <h3 className="mt-3 text-base font-semibold text-green-800">Signed!</h3>
        <p className="mt-1 text-sm text-green-700">Your signature has been recorded. You may close this page.</p>
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 text-sm font-medium text-green-700 underline"
        >
          Add another signature
        </button>
      </div>
    )
  }

  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="flex items-center gap-2 mb-1">
        <PenLine className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-slate-900">Sign Off</h3>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          name="printed_name"
          required
          placeholder="Your full name"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Employee ID <span className="text-slate-400">(optional)</span>
        </label>
        <input
          name="worker_identifier"
          placeholder="Badge number or employee ID"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        I Have Read and Understood This Talk
      </button>

      <p className="text-center text-xs text-slate-400">
        By signing, you confirm you attended and understood this toolbox talk.
      </p>
    </form>
  )
}
