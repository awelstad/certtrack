'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ScanLine } from 'lucide-react'

export default function KioskLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInErr) {
        setError('Invalid email or password.')
        return
      }

      // Fetch profile to confirm kiosk role and get job
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Login failed.'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, kiosk_job_id')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'kiosk' && profile.kiosk_job_id) {
        router.replace(`/kiosk/${profile.kiosk_job_id}`)
      } else if (profile?.role === 'kiosk') {
        router.replace('/kiosk')
      } else {
        // Not a kiosk account — redirect to main app
        router.replace('/jobs')
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 mb-4">
            <ScanLine className="h-7 w-7 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Kiosk Login</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in with your kiosk account</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-slate-800 p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/40 border border-red-700 px-3 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kiosk@yourcompany.com"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl py-3 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {pending ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600">
          Not a kiosk? <a href="/login" className="text-slate-400 hover:text-white underline">Manager login</a>
        </p>
      </div>
    </div>
  )
}
