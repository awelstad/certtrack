'use client'

import { useState, useTransition } from 'react'
import { updateOrgSettings } from '@/app/actions/orgSettings'
import { HardHat } from 'lucide-react'

export function WorkerPortalSettings({
  initialWorkersCanUploadCerts,
}: {
  initialWorkersCanUploadCerts: boolean
}) {
  const [enabled, setEnabled] = useState(initialWorkersCanUploadCerts)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function toggle() {
    const next = !enabled
    setEnabled(next)
    setError('')
    startTransition(async () => {
      const result = await updateOrgSettings({ workersCanUploadCerts: next })
      if (result.error) {
        setEnabled(!next) // revert
        setError(result.error)
      }
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <HardHat className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Worker Portal</h2>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-900">Allow workers to upload certifications</p>
          <p className="text-xs text-slate-500 mt-0.5">
            When on, workers can submit certs for review via the worker portal. Managers still approve before they count.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
            enabled ? 'bg-orange-500' : 'bg-slate-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
