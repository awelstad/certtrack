'use client'

import { useActionState } from 'react'
import { updateOrgName } from '@/app/actions/platform'

type Props = { orgId: string; currentName: string }

export function EditOrgNameForm({ orgId, currentName }: Props) {
  const [state, action, pending] = useActionState(updateOrgName, null)

  return (
    <form action={action} className="flex items-end gap-3">
      <input type="hidden" name="org_id" value={orgId} />
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-600">Organization Name</label>
        <input
          name="name"
          defaultValue={currentName}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">Saved</p>}
    </form>
  )
}
