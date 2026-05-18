'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, KeyRound, Trash2, Check, X } from 'lucide-react'
import { updateUserProfile, sendPasswordResetEmail, removeUserFromOrg } from '@/app/actions/platform'

type UserRow = {
  id: string
  full_name: string
  email: string
  role: string
  joined: string
}

const roleOptions = [
  { value: 'owner',               label: 'Owner' },
  { value: 'admin',               label: 'Admin' },
  { value: 'pm',                  label: 'Project Manager' },
  { value: 'superintendent',      label: 'Superintendent' },
  { value: 'worker',              label: 'Worker' },
  { value: 'subcontractor_admin', label: 'Subcontractor Admin' },
  { value: 'gc_read_only',        label: 'GC Read-Only' },
]

const roleLabel: Record<string, string> = Object.fromEntries(roleOptions.map((r) => [r.value, r.label]))

export function UserManagementTable({ users, orgId }: { users: UserRow[]; orgId: string }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  function startEdit(user: UserRow) {
    setEditingId(user.id)
    setEditName(user.full_name)
    setEditRole(user.role)
    setEditError('')
  }

  async function saveEdit(userId: string) {
    setSaving(true)
    setEditError('')
    const res = await updateUserProfile(userId, orgId, { full_name: editName, role: editRole })
    setSaving(false)
    if (res.error) { setEditError(res.error); return }
    setEditingId(null)
    router.refresh()
  }

  async function handleReset(email: string) {
    if (!confirm(`Send password reset email to ${email}?`)) return
    const res = await sendPasswordResetEmail(email)
    if (res.error) alert(`Error: ${res.error}`)
    else alert('Password reset email sent!')
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from this organization?\n\nThis permanently deletes their account and cannot be undone.`)) return
    const res = await removeUserFromOrg(userId, orgId)
    if (res.error) alert(`Error: ${res.error}`)
    else router.refresh()
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50">
          {['Name', 'Email', 'Role', 'Joined', ''].map((h) => (
            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {users.map((u) => {
          const isEditing = editingId === u.id
          return (
            <tr key={u.id} className={isEditing ? 'bg-orange-50' : 'hover:bg-slate-50'}>
              <td className="px-4 py-3">
                {isEditing ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-orange-400 focus:outline-none"
                  />
                ) : (
                  <span className="font-medium text-slate-900">{u.full_name}</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-500">{u.email}</td>
              <td className="px-4 py-3">
                {isEditing ? (
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-sm focus:border-orange-400 focus:outline-none"
                  >
                    {roleOptions.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {roleLabel[u.role] ?? u.role}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-500">{u.joined}</td>
              <td className="px-4 py-3">
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => saveEdit(u.id)}
                      disabled={saving}
                      title="Save changes"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      title="Cancel"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {editError && <span className="text-xs text-red-500">{editError}</span>}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(u)}
                      title="Edit name / role"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleReset(u.email)}
                      title="Send password reset email"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(u.id, u.full_name)}
                      title="Remove user"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          )
        })}
        {users.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
              No users yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
