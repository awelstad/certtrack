'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteOrganization } from '@/app/actions/platform'
import { Trash2 } from 'lucide-react'

type Props = { orgId: string; orgName: string }

export function DeleteOrgButton({ orgId, orgName }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setPending(true)
    const result = await deleteOrganization(orgId)
    if (result.error) {
      setError(result.error)
      setPending(false)
    } else {
      router.push('/super-admin')
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
        Delete Organization
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-slate-700">
        Delete <strong>{orgName}</strong> and all its data? This cannot be undone.
      </p>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? 'Deleting…' : 'Confirm Delete'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
