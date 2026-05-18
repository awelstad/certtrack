'use client'

import { useState, useTransition } from 'react'
import { createKioskAccount, deleteKioskAccount } from '@/app/actions/kioskAccount'
import { Tablet, Plus, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react'

type Account = { id: string; email: string; created_at: string }

export function KioskAccountManager({
  jobId,
  initialAccounts,
}: {
  jobId: string
  initialAccounts: Account[]
}) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, startTransition] = useTransition()

  function generatePassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let pw = ''
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    setPassword(pw)
    setShowPw(true)
  }

  function copyPassword() {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    startTransition(async () => {
      const result = await createKioskAccount({ jobId, email, password })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Kiosk account created for ${email}`)
        setAccounts((prev) => [...prev, {
          id: crypto.randomUUID(),
          email,
          created_at: new Date().toISOString(),
        }])
        setEmail('')
        setPassword('')
        setShowForm(false)
      }
    })
  }

  function handleDelete(accountId: string, accountEmail: string) {
    if (!confirm(`Delete kiosk account for ${accountEmail}? The tablet will be signed out.`)) return
    startTransition(async () => {
      const result = await deleteKioskAccount({ kioskUserId: accountId, jobId })
      if (result.error) {
        setError(result.error)
      } else {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId))
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tablet className="h-5 w-5 text-slate-600" />
          <h2 className="font-semibold text-slate-900">Kiosk Accounts</h2>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setError(''); setSuccess('') }}
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Plus className="h-3.5 w-3.5" />
            New Account
          </button>
        )}
      </div>

      <p className="text-sm text-slate-500">
        Create a login for the tablet at this job site. The kiosk account can only access this job&apos;s scanner screen.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kiosk-site@yourcompany.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-9 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <button
                  type="button"
                  onClick={copyPassword}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-600 hover:bg-slate-50"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={generatePassword}
              className="mt-1.5 text-xs text-orange-500 hover:underline"
            >
              Generate random password
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {pending ? 'Creating…' : 'Create Kiosk Account'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {accounts.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between px-4 py-3 bg-white">
              <div>
                <p className="text-sm font-medium text-slate-900">{account.email}</p>
                <p className="text-xs text-slate-400">
                  Created {new Date(account.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(account.id, account.email)}
                disabled={pending}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : !showForm ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center">
          <Tablet className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No kiosk accounts yet.</p>
          <p className="text-xs text-slate-400 mt-1">Create one to set up the check-in tablet.</p>
        </div>
      ) : null}
    </div>
  )
}
