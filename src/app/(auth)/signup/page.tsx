'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signUp } from '@/app/actions/signup'
import { ClearworkMark } from '@/components/ui/ClearworkMark'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, null)

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <ClearworkMark size={56} className="rounded-2xl" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Start your free trial</h1>
          <p className="mt-1 text-sm text-slate-400">14 days free · No credit card required</p>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-white p-8 shadow-2xl">
        <form action={action} className="space-y-4">
          {state?.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-slate-700">
              Company Name
            </label>
            <input
              id="company"
              name="company"
              type="text"
              autoComplete="organization"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="Acme Construction"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Work Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="jane@yourcompany.com"
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
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="Min. 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 w-full rounded-lg bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending ? 'Creating account…' : 'Start Free Trial'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-orange-400 hover:text-orange-300">
          Sign in
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-slate-500">
        By signing up you agree to our terms of service and privacy policy.
      </p>
    </div>
  )
}
