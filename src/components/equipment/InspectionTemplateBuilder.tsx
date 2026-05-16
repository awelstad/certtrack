'use client'

import { useState } from 'react'
import { Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import type { ChecklistTemplateItem } from '@/lib/equipment'

interface EquipmentType { id: string; name: string; category: string }

interface Props {
  formAction: (fd: FormData) => void
  pending: boolean
  state: { error?: string; templateId?: string } | null
  equipmentTypes: EquipmentType[]
  templateId?: string
  initialValues?: {
    title: string
    description: string
    equipmentTypeId: string
    items: ChecklistTemplateItem[]
  }
}

function uid() { return crypto.randomUUID() }

export function InspectionTemplateBuilder({
  formAction,
  pending,
  state,
  equipmentTypes,
  templateId,
  initialValues,
}: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [equipmentTypeId, setEquipmentTypeId] = useState(initialValues?.equipmentTypeId ?? '')
  const [items, setItems] = useState<ChecklistTemplateItem[]>(initialValues?.items ?? [])

  function addItem() {
    setItems((prev) => [...prev, { id: uid(), label: '', is_critical: false }])
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function updateLabel(id: string, label: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, label } : it))
  }

  function toggleCritical(id: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, is_critical: !it.is_critical } : it))
  }

  const categories = Array.from(new Set(equipmentTypes.map((t) => t.category)))

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden fields for dynamic state */}
      <input type="hidden" name="checklist_items" value={JSON.stringify(items)} />
      {templateId && <input type="hidden" name="templateId" value={templateId} />}

      {/* Basic info */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Template Details</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Daily Scissor Lift Inspection"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Equipment Type <span className="text-slate-400">(optional)</span>
            </label>
            <select
              name="equipment_type_id"
              value={equipmentTypeId}
              onChange={(e) => setEquipmentTypeId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">— All equipment types —</option>
              {categories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {equipmentTypes.filter((t) => t.category === cat).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
              <option value="">Other / General Purpose</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of when to use this template…"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Checklist Items ({items.length})
          </h2>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400">No checklist items yet. Add some above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className="mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {idx + 1}
                </span>
                <input
                  value={item.label}
                  onChange={(e) => updateLabel(item.id, e.target.value)}
                  placeholder="Inspection item description…"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => toggleCritical(item.id)}
                  title="Mark as critical — fail triggers out-of-service"
                  className={[
                    'mt-0.5 flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors',
                    item.is_critical
                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Critical
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="mt-0.5 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
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
        {templateId ? 'Save Changes' : 'Create Template'}
      </button>
    </form>
  )
}
