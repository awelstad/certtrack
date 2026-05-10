'use client'

import { useActionState } from 'react'
import { inviteUserToOrg } from '@/app/actions/platform'

const ROLES = [
  { value: 'owner',               label: 'Owner' },
  { value: 'admin',               label: 'Admin' },
  { value: 'pm',                  label: 'Project Manager' },
  { value: 'superintendent',      label: 'Superintendent' },
  { value: 'worker',              label: 'Worker' },
  { value: 'subcontractor_admin', label: 'Subcontractor Admin' },
  { value: 'gc_read_only',        label: 'GC Read-Only' },
]

type Props = { orgId: string }

export function InviteUserForm({ orgId }: Props) {
  const [state, action, pending] = useActionState(inviteUserToOrg, null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="org_id" value={orgId} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Full Name</label>
          <input
            name="full_name"
            placeholder="Jane Smith"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="jane@example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
          <select
            name="role"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Temporary Password</label>
          <input
            name="password"
            type="text"
            required
            defaultValue="Admin1234!"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create User'}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-600">User created — they can log in with the password above.</p>}
      </div>
    </form>
  )
}
