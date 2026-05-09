'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { DEFAULT_PPE_ITEMS } from '@/lib/jha'
import type { JhaStep, JhaHazard, JhaFieldValues, JhaTemplate } from '@/lib/jha'

interface Job { id: string; name: string }

interface InitialValues {
  title: string
  workDescription: string
  workArea: string
  workDate: string
  jobId: string | null
  templateId: string | null
  fieldValues: JhaFieldValues
}

interface Props {
  jhaId?: string
  initialValues: InitialValues
  formAction: (fd: FormData) => void
  pending: boolean
  state: { error?: string; jhaId?: string } | null
  jobs: Job[]
  templates: Array<{ id: string; title: string; default_steps: JhaStep[]; default_ppe: string[] }>
}

function uid() { return crypto.randomUUID() }

export function JhaFormBuilder({
  jhaId,
  initialValues,
  formAction,
  pending,
  state,
  jobs,
  templates,
}: Props) {
  const fv = initialValues.fieldValues

  // Standard fields
  const [title,            setTitle]            = useState(initialValues.title)
  const [jobId,            setJobId]            = useState(initialValues.jobId ?? '')
  const [workDate,         setWorkDate]         = useState(initialValues.workDate)
  const [workArea,         setWorkArea]         = useState(initialValues.workArea)
  const [workDescription,  setWorkDescription]  = useState(initialValues.workDescription)
  const [templateId,       setTemplateId]       = useState(initialValues.templateId ?? '')

  // field_values fields
  const [company,          setCompany]          = useState(fv.company)
  const [supervisor,       setSupervisor]       = useState(fv.supervisor)
  const [foreman,          setForeman]          = useState(fv.foreman)
  const [weather,          setWeather]          = useState(fv.weather)
  const [emergencyContact, setEmergencyContact] = useState(fv.emergency_contact)
  const [emergencyNotes,   setEmergencyNotes]   = useState(fv.emergency_notes)
  const [notes,            setNotes]            = useState(fv.notes)
  const [tools,            setTools]            = useState(fv.tools)
  const [ppe,              setPpe]              = useState<string[]>(fv.ppe)
  const [steps,            setSteps]            = useState<JhaStep[]>(fv.steps)

  // ── Template selector ─────────────────────────────────────

  function applyTemplate(tid: string) {
    setTemplateId(tid)
    if (!tid) return
    const tmpl = templates.find((t) => t.id === tid)
    if (!tmpl) return
    setSteps(
      (tmpl.default_steps || []).map((s) => ({
        ...s,
        id: uid(),
        hazards: (s.hazards || []).map((h) => ({ ...h, id: uid() })),
      }))
    )
    setPpe(tmpl.default_ppe || [])
  }

  // ── Step mutations ────────────────────────────────────────

  function addStep() {
    setSteps((prev) => [...prev, { id: uid(), description: '', hazards: [] }])
  }

  function removeStep(sid: string) {
    setSteps((prev) => prev.filter((s) => s.id !== sid))
  }

  function moveStep(sid: string, dir: -1 | 1) {
    setSteps((prev) => {
      const i = prev.findIndex((s) => s.id === sid)
      if (i + dir < 0 || i + dir >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
      return next
    })
  }

  function updateStepDesc(sid: string, desc: string) {
    setSteps((prev) => prev.map((s) => (s.id === sid ? { ...s, description: desc } : s)))
  }

  // ── Hazard mutations ──────────────────────────────────────

  function addHazard(sid: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === sid
          ? { ...s, hazards: [...s.hazards, { id: uid(), description: '', controls: [''] }] }
          : s
      )
    )
  }

  function removeHazard(sid: string, hid: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === sid ? { ...s, hazards: s.hazards.filter((h) => h.id !== hid) } : s
      )
    )
  }

  function updateHazardDesc(sid: string, hid: string, desc: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === sid
          ? { ...s, hazards: s.hazards.map((h) => (h.id === hid ? { ...h, description: desc } : h)) }
          : s
      )
    )
  }

  // ── Control mutations ─────────────────────────────────────

  function addControl(sid: string, hid: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === sid
          ? {
              ...s,
              hazards: s.hazards.map((h) =>
                h.id === hid ? { ...h, controls: [...h.controls, ''] } : h
              ),
            }
          : s
      )
    )
  }

  function removeControl(sid: string, hid: string, ci: number) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === sid
          ? {
              ...s,
              hazards: s.hazards.map((h) =>
                h.id === hid ? { ...h, controls: h.controls.filter((_, i) => i !== ci) } : h
              ),
            }
          : s
      )
    )
  }

  function updateControl(sid: string, hid: string, ci: number, val: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === sid
          ? {
              ...s,
              hazards: s.hazards.map((h) =>
                h.id === hid
                  ? { ...h, controls: h.controls.map((c, i) => (i === ci ? val : c)) }
                  : h
              ),
            }
          : s
      )
    )
  }

  // ── PPE toggle ────────────────────────────────────────────

  function togglePpe(item: string) {
    setPpe((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]
    )
  }

  // ── Serialized field values ───────────────────────────────

  const fieldValues: JhaFieldValues = {
    company, supervisor, foreman, weather,
    emergency_contact: emergencyContact,
    emergency_notes:   emergencyNotes,
    notes, tools, ppe, steps,
  }

  // ── Render ────────────────────────────────────────────────

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500'
  const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700'
  const cardCls  = 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden inputs */}
      {jhaId && <input type="hidden" name="id" value={jhaId} />}
      <input type="hidden" name="template_id" value={templateId} />
      <input type="hidden" name="fieldValues"  value={JSON.stringify(fieldValues)} />

      {/* ── Template selector (create only) ── */}
      {!jhaId && templates.length > 0 && (
        <div className={cardCls}>
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Start from Template</h2>
          <p className="mb-4 text-xs text-slate-500">
            Selecting a template pre-fills the steps, hazards, and PPE. You can customize everything below.
          </p>
          <select
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            className={inputCls}
          >
            <option value="">Start blank</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          {templateId && (
            <p className="mt-2 text-xs text-green-600 font-medium">
              ✓ Template applied — steps and PPE pre-filled.
            </p>
          )}
        </div>
      )}

      {/* ── Job Information ── */}
      <div className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Job Information</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>JHA Title <span className="text-red-500">*</span></label>
            <input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Excavation — Lot A Trenching"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Job Site</label>
              <select
                name="job_id"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className={inputCls}
              >
                <option value="">— No job selected —</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input
                name="work_date"
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Work Location / Area</label>
            <input
              name="work_area"
              value={workArea}
              onChange={(e) => setWorkArea(e.target.value)}
              placeholder="e.g. North elevation, Grid C4"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Work Activity / Description</label>
            <textarea
              name="work_description"
              rows={3}
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="Describe the work being performed…"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── Personnel ── */}
      <div className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Personnel</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: 'Company',          val: company,    set: setCompany,    ph: 'Contractor name' },
            { label: 'Supervisor',        val: supervisor, set: setSupervisor, ph: 'Supervisor / PM name' },
            { label: 'Foreman / Lead',    val: foreman,    set: setForeman,    ph: 'Foreman name' },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label className={labelCls}>{label}</label>
              <input
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder={ph}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Steps, Hazards & Controls ── */}
      <div className={cardCls}>
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Steps, Hazards &amp; Controls</h2>
        <p className="mb-5 text-xs text-slate-500">
          Break the work into sequential steps. For each step, identify hazards and describe how to control them.
        </p>

        <div className="space-y-4">
          {steps.map((step, si) => (
            <StepCard
              key={step.id}
              step={step}
              index={si}
              total={steps.length}
              onRemove={() => removeStep(step.id)}
              onMove={(dir) => moveStep(step.id, dir)}
              onDescChange={(v) => updateStepDesc(step.id, v)}
              onAddHazard={() => addHazard(step.id)}
              onRemoveHazard={(hid) => removeHazard(step.id, hid)}
              onHazardDescChange={(hid, v) => updateHazardDesc(step.id, hid, v)}
              onAddControl={(hid) => addControl(step.id, hid)}
              onRemoveControl={(hid, ci) => removeControl(step.id, hid, ci)}
              onControlChange={(hid, ci, v) => updateControl(step.id, hid, ci, v)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addStep}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Step
        </button>
      </div>

      {/* ── Required PPE ── */}
      <div className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Required PPE</h2>
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

      {/* ── Conditions & Equipment ── */}
      <div className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Conditions &amp; Equipment</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Weather Conditions</label>
            <input
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              placeholder="e.g. Clear, 68°F, light wind"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tools &amp; Equipment</label>
            <textarea
              rows={3}
              value={tools}
              onChange={(e) => setTools(e.target.value)}
              placeholder="List tools and equipment being used…"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── Emergency Information ── */}
      <div className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Emergency Information</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Emergency Contact</label>
            <input
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Name, phone number, or 911"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Emergency Notes / Hospital Location</label>
            <textarea
              rows={2}
              value={emergencyNotes}
              onChange={(e) => setEmergencyNotes(e.target.value)}
              placeholder="Nearest hospital, evacuation route, muster point…"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      <div className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Additional Notes</h2>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes or instructions for workers…"
          className={inputCls}
        />
      </div>

      {/* ── Status / Actions ── */}
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
      {state && !state.error && !state.jhaId && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">Saved successfully.</p>
      )}

      <div className="flex justify-end gap-3">
        <a
          href="/jha"
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {jhaId ? 'Save Changes' : 'Create JHA'}
        </button>
      </div>
    </form>
  )
}

// ── Sub-components ────────────────────────────────────────────

interface StepCardProps {
  step: JhaStep
  index: number
  total: number
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onDescChange: (v: string) => void
  onAddHazard: () => void
  onRemoveHazard: (hid: string) => void
  onHazardDescChange: (hid: string, v: string) => void
  onAddControl: (hid: string) => void
  onRemoveControl: (hid: string, ci: number) => void
  onControlChange: (hid: string, ci: number, v: string) => void
}

function StepCard({
  step, index, total,
  onRemove, onMove, onDescChange,
  onAddHazard, onRemoveHazard, onHazardDescChange,
  onAddControl, onRemoveControl, onControlChange,
}: StepCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Step header */}
      <div className="flex items-center gap-2 bg-slate-800 px-4 py-2.5">
        <span className="text-sm font-semibold text-white">Step {index + 1}</span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0}
            className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-30">
            <ChevronUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1}
            className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-30">
            <ChevronDown className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove}
            className="rounded p-1 text-slate-400 hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Step description */}
        <textarea
          rows={2}
          value={step.description}
          onChange={(e) => onDescChange(e.target.value)}
          placeholder="Describe this work step…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />

        {/* Hazards */}
        {step.hazards.length > 0 && (
          <div className="space-y-2">
            {step.hazards.map((hazard, hi) => (
              <HazardCard
                key={hazard.id}
                hazard={hazard}
                index={hi}
                onRemove={() => onRemoveHazard(hazard.id)}
                onDescChange={(v) => onHazardDescChange(hazard.id, v)}
                onAddControl={() => onAddControl(hazard.id)}
                onRemoveControl={(ci) => onRemoveControl(hazard.id, ci)}
                onControlChange={(ci, v) => onControlChange(hazard.id, ci, v)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onAddHazard}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Hazard
        </button>
      </div>
    </div>
  )
}

interface HazardCardProps {
  hazard: JhaHazard
  index: number
  onRemove: () => void
  onDescChange: (v: string) => void
  onAddControl: () => void
  onRemoveControl: (ci: number) => void
  onControlChange: (ci: number, v: string) => void
}

function HazardCard({
  hazard, index,
  onRemove, onDescChange,
  onAddControl, onRemoveControl, onControlChange,
}: HazardCardProps) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50/40">
      {/* Hazard header */}
      <div className="flex items-center gap-2 border-b border-red-100 px-3 py-1.5">
        <span className="text-xs font-semibold text-red-600">Hazard {index + 1}</span>
        <button type="button" onClick={onRemove}
          className="ml-auto text-red-300 hover:text-red-500">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <input
          value={hazard.description}
          onChange={(e) => onDescChange(e.target.value)}
          placeholder="Describe the hazard…"
          className="w-full rounded border border-red-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400"
        />

        {/* Controls */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-green-700">Controls / Safety Measures</p>
          {hazard.controls.map((ctrl, ci) => (
            <div key={ci} className="flex items-center gap-2">
              <span className="text-green-500 text-xs shrink-0">✓</span>
              <input
                value={ctrl}
                onChange={(e) => onControlChange(ci, e.target.value)}
                placeholder="Describe control measure…"
                className="flex-1 rounded border border-green-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-green-400"
              />
              <button type="button" onClick={() => onRemoveControl(ci)}
                className="shrink-0 text-slate-300 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onAddControl}
            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add control
          </button>
        </div>
      </div>
    </div>
  )
}
