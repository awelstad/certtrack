'use client'

import { useState, useTransition } from 'react'
import { startOrientationAuth } from '@/app/actions/orientationAuth'

type Props = {
  jobId: string
  jobName: string
  orgName: string
  logoUrl: string | null
  brandColor: string
  jobLocation: string | null
}

export function OrientationIdentityGate({ jobId, jobName, orgName, logoUrl, brandColor, jobLocation }: Props) {
  const [pending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await startOrientationAuth({ fullName, email, phone, jobId, jobName })
      if (result.error) {
        setError(result.error)
      } else {
        setSent(true)
      }
    })
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center space-y-5">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={orgName} className="mx-auto h-12 object-contain" />
          )}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Check Your Email</h2>
            <p className="mt-2 text-sm text-slate-500">
              We sent a secure link to <span className="font-semibold text-slate-700">{email}</span>.
              Click it to continue your orientation for <span className="font-semibold text-slate-700">{jobName}</span>.
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
          </div>
          <button
            onClick={() => setSent(false)}
            className="text-sm text-slate-400 hover:text-slate-600 underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Branded header */}
      <div className="w-full py-5 px-6 flex flex-col items-center gap-3" style={{ backgroundColor: brandColor }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={orgName} className="h-12 object-contain brightness-0 invert" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
        <p className="text-white/90 text-sm font-medium">{orgName}</p>
      </div>

      {/* Job info banner */}
      <div className="w-full bg-slate-800 px-6 py-4 text-center">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-0.5">Site Safety Orientation</p>
        <p className="text-white font-bold text-lg leading-tight">{jobName}</p>
        {jobLocation && <p className="text-slate-300 text-sm mt-0.5">{jobLocation}</p>}
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-7 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sign in to begin</h2>
            <p className="text-sm text-slate-500 mt-1">We&apos;ll email you a secure link — no password needed.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="First Last"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: brandColor }}
            >
              {pending ? 'Sending link…' : 'Send My Orientation Link →'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400">
            Already received a link? Click it in your email to continue.
          </p>
        </div>
      </div>
    </div>
  )
}
