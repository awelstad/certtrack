'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HardHat } from 'lucide-react'
import { Suspense } from 'react'

function WorkerLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const supabase = createClient()
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/worker` },
      })
      if (err) {
        setError(err.message)
      } else {
        setSent(true)
      }
    })
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <svg className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Check your email</h2>
          <p className="mt-1 text-sm text-slate-500">
            We sent a login link to <span className="font-semibold text-slate-700">{email}</span>.
            Click it to access your portal.
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Link expires in 1 hour. Check your spam if you don&apos;t see it.
        </div>
        <button
          onClick={() => setSent(false)}
          className="text-sm text-slate-400 hover:text-slate-600 underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Your email address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Sending link…' : 'Send Login Link →'}
      </button>
    </form>
  )
}

export default function WorkerLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 mb-4">
            <HardHat className="h-7 w-7 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Worker Portal</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to view your certs and orientation history</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-slate-100" />}>
            <WorkerLoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-slate-400">
          No password needed — we&apos;ll email you a secure link.
        </p>
      </div>
    </div>
  )
}
