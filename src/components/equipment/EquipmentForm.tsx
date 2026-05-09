'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface EquipmentType { id: string; name: string; category: string }
interface Job { id: string; name: string }
interface Worker { id: string; first_name: string; last_name: string }

interface InitialValues {
  name: string
  equipmentTypeId: string
  make: string
  model: string
  serialNumber: string
  companyAssetNumber: string
  year: string
  jobId: string
  assignedWorkerId: string
  photoUrl: string
  notes: string
  status: string
}

interface Props {
  formAction: (fd: FormData) => void
  pending: boolean
  state: { error?: string } | null
  equipmentTypes: EquipmentType[]
  jobs: Job[]
  workers: Worker[]
  equipmentId?: string
  initialValues?: Partial<InitialValues>
}

const STATUS_OPTIONS = [
  { value: 'active',         label: 'Active' },
  { value: 'inactive',       label: 'Inactive' },
  { value: 'out_of_service', label: 'Out of Service' },
  { value: 'retired',        label: 'Retired' },
]

export function EquipmentForm({
  formAction,
  pending,
  state,
  equipmentTypes,
  jobs,
  workers,
  equipmentId,
  initialValues = {},
}: Props) {
  const categories = Array.from(new Set(equipmentTypes.map((t) => t.category)))

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (equipmentId) fd.set('equipmentId', equipmentId)
    formAction(fd)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identification */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Identification</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Equipment Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              defaultValue={initialValues.name}
              required
              placeholder="e.g. Scissor Lift #1"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Equipment Type</label>
            <select
              name="equipment_type_id"
              defaultValue={initialValues.equipmentTypeId ?? ''}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">— Select type —</option>
              {categories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {equipmentTypes.filter((t) => t.category === cat).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Year</label>
            <input
              name="year"
              type="number"
              defaultValue={initialValues.year}
              min="1900"
              max={new Date().getFullYear() + 1}
              placeholder="e.g. 2022"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Make</label>
            <input
              name="make"
              defaultValue={initialValues.make}
              placeholder="e.g. JLG"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Model</label>
            <input
              name="model"
              defaultValue={initialValues.model}
              placeholder="e.g. 3369LE"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Serial Number</label>
            <input
              name="serial_number"
              defaultValue={initialValues.serialNumber}
              placeholder="Manufacturer serial number"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Company Asset Number</label>
            <input
              name="company_asset_number"
              defaultValue={initialValues.companyAssetNumber}
              placeholder="Internal asset / tag number"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Assignment */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Assignment</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Job Site</label>
            <select
              name="job_id"
              defaultValue={initialValues.jobId ?? ''}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">— Unassigned —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Assigned Worker</label>
            <select
              name="assigned_worker_id"
              defaultValue={initialValues.assignedWorkerId ?? ''}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">— None —</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Status (edit only) */}
      {equipmentId && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Status</h2>
          <select
            name="status"
            defaultValue={initialValues.status ?? 'active'}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Photo & Notes */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Details</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Photo URL</label>
            <input
              name="photo_url"
              type="url"
              defaultValue={initialValues.photoUrl}
              placeholder="https://…"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="mt-1 text-xs text-slate-400">Upload to your storage first and paste the URL here.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              name="notes"
              defaultValue={initialValues.notes}
              rows={3}
              placeholder="Any relevant details, maintenance history, or notes…"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {equipmentId ? 'Save Changes' : 'Add Equipment'}
      </button>
    </form>
  )
}
