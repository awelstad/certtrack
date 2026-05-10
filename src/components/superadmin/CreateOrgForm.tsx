'use client'

import { useActionState, useEffect, useState } from 'react'
import { createOrganization } from '@/app/actions/platform'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'

const DEFAULT_PASSWORD = 'Admin1234!'

export function CreateOrgForm() {
  const [state, formAction, pending] = useActionState(createOrganization, null)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    if (state?.orgId) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state])

  if (state?.orgId) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-green-200 bg-green-50 px-8 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
        <div>
          <p className="text-lg font-bold text-green-900">Organization created!</p>
          <p className="mt-1 text-sm text-green-700">
            The admin account is ready. Share these credentials with the company:
          </p>
        </div>
        <div className="w-full rounded-xl border border-green-200 bg-white p-4 text-left text-sm">
          <p><span className="font-medium text-slate-500">Password:</span> <span className="font-mono font-bold text-slate-900">{state.tempPassword}</span></p>
        </div>
        <a
          href="/super-admin"
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Back to Organizations
        </a>
      </div>
    )
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500'

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Company Details</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input name="org_name" required placeholder="Fortune Electrical" className={inputCls} />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Admin Account</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
            <input name="admin_name" placeholder="John Smith" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input name="admin_email" type="email" required placeholder="admin@company.com" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Temporary Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                name="admin_password"
                type={showPw ? 'text' : 'password'}
                required
                defaultValue={DEFAULT_PASSWORD}
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">Default is Admin1234! — change it or leave as-is.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create Organization'}
        </button>
        <a
          href="/super-admin"
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
