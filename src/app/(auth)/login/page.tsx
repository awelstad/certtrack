'use client'

import { useActionState } from 'react'
import { signIn } from '@/app/actions/auth'
import { ClearworkMark } from '@/components/ui/ClearworkMark'

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null)

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <ClearworkMark size={56} className="rounded-2xl" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Clearwork</h1>
          <p className="mt-1 text-sm text-slate-400">Construction Compliance</p>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-white p-8 shadow-2xl">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Sign in to your account</h2>

        <form action={action} className="space-y-4">
          {state?.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 w-full rounded-lg bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Contact your administrator if you need access.
      </p>
    </div>
  )
}
