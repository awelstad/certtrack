'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createJhaTemplate } from '@/app/actions/jha'
import { DEFAULT_PPE_ITEMS } from '@/lib/jha'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import type { JhaStep, JhaHazard } from '@/lib/jha'

function uid() { return crypto.randomUUID() }

export function JhaTemplateForm() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createJhaTemplate, null)

  const [steps, setSteps] = useState<JhaStep[]>([])
  const [ppe,   setPpe]   = useState<string[]>([])

  useEffect(() => {
    if (state?.templateId) router.push('/jha/templates')
  }, [state?.templateId, router])

  function addStep() {
    setSteps((p) => [...p, { id: uid(), description: '', hazards: [] }])
  }

  function removeStep(sid: string) {
    setSteps((p) => p.filter((s) => s.id !== sid))
  }

  function updateStep(sid: string, desc: string) {
    setSteps((p) => p.map((s) => (s.id === sid ? { ...s, description: desc } : s)))
  }

  function addHazard(sid: string) {
    setSteps((p) => p.map((s) =>
      s.id === sid ? { ...s, hazards: [...s.hazards, { id: uid(), description: '', controls: [''] }] } : s
    ))
  }

  function removeHazard(sid: string, hid: string) {
    setSteps((p) => p.map((s) =>
      s.id === sid ? { ...s, hazards: s.hazards.filter((h) => h.id !== hid) } : s
    ))
  }

  function updateHazard(sid: string, hid: string, desc: string) {
    setSteps((p) => p.map((s) =>
      s.id === sid
        ? { ...s, hazards: s.hazards.map((h) => (h.id === hid ? { ...h, description: desc } : h)) }
        : s
    ))
  }

  function addControl(sid: string, hid: string) {
    setSteps((p) => p.map((s) =>
      s.id === sid
        ? { ...s, hazards: s.hazards.map((h) => (h.id === hid ? { ...h, controls: [...h.controls, ''] } : h)) }
        : s
    ))
  }

  function updateControl(sid: string, hid: string, ci: number, val: string) {
    setSteps((p) => p.map((s) =>
      s.id === sid
        ? { ...s, hazards: s.hazards.map((h) =>
              h.id === hid ? { ...h, controls: h.controls.map((c, i) => (i === ci ? val : c)) } : h
          )}
        : s
    ))
  }

  function togglePpe(item: string) {
    setPpe((p) => p.includes(item) ? p.filter((x) => x !== item) : [...p, item])
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500'
  const cardCls  = 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="defaultSteps" value={JSON.stringify(steps)} />
      <input type="hidden" name="defaultPpe"   value={JSON.stringify(ppe)} />

      {/* Basic info */}
      <div className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Template Details</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input name="title" required placeholder="e.g. Excavation & Trenching" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <input name="description" placeholder="Brief description of when to use this template" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Default Steps */}
      <div className={cardCls}>
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Default Steps &amp; Hazards</h2>
        <p className="mb-5 text-xs text-slate-500">These steps will be pre-filled when creating a JHA from this template.</p>

        <div className="space-y-3">
          {steps.map((step, si) => (
            <div key={step.id} className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 bg-slate-800 px-4 py-2.5">
                <span className="text-sm font-semibold text-white">Step {si + 1}</span>
                <button type="button" onClick={() => removeStep(step.id)} className="ml-auto text-slate-400 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                <textarea
                  rows={2}
                  value={step.description}
                  onChange={(e) => updateStep(step.id, e.target.value)}
                  placeholder="Describe this step…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {step.hazards.map((h, hi) => (
                  <div key={h.id} className="rounded-lg border border-red-100 bg-red-50/40 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-red-600">Hazard {hi + 1}</span>
                      <button type="button" onClick={() => removeHazard(step.id, h.id)} className="ml-auto text-red-300 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      value={h.description}
                      onChange={(e) => updateHazard(step.id, h.id, e.target.value)}
                      placeholder="Hazard description…"
                      className="w-full rounded border border-red-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none"
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-green-700">Controls</p>
                      {h.controls.map((ctrl, ci) => (
                        <input
                          key={ci}
                          value={ctrl}
                          onChange={(e) => updateControl(step.id, h.id, ci, e.target.value)}
                          placeholder="Control measure…"
                          className="w-full rounded border border-green-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none"
                        />
                      ))}
                      <button type="button" onClick={() => addControl(step.id, h.id)} className="text-xs text-green-600 hover:text-green-800">
                        + Add control
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => addHazard(step.id)}
                  className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700">
                  <Plus className="h-3.5 w-3.5" /> Add Hazard
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addStep}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 hover:border-orange-300 hover:text-orange-600 transition-colors">
          <Plus className="h-4 w-4" /> Add Step
        </button>
      </div>

      {/* Default PPE */}
      <div className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Default Required PPE</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DEFAULT_PPE_ITEMS.map((item) => (
            <label key={item} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={ppe.includes(item)}
                onChange={() => togglePpe(item)}
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-700">{item}</span>
            </label>
          ))}
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end gap-3">
        <a href="/jha/templates" className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </a>
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Template
        </button>
      </div>
    </form>
  )
}
