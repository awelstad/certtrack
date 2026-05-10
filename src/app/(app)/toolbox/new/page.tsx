'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createToolboxTalk } from '@/app/actions/toolboxTalk'
import { ArrowLeft, Loader2 } from 'lucide-react'

// Template data is fetched client-side after load
type Template = { id: string; title: string; topic: string | null; content: string }

export default function NewToolboxTalkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get('template')

  const [state, formAction, pending] = useActionState(createToolboxTalk, null)

  const [title, setTitle]       = useState('')
  const [topic, setTopic]       = useState('')
  const [content, setContent]   = useState('')
  const [jobs, setJobs]         = useState<{ id: string; name: string }[]>([])
  const [loadingTpl, setLoadingTpl] = useState(!!templateId)

  // Redirect after successful creation
  useEffect(() => {
    if (state?.id) router.push(`/toolbox/${state.id}`)
  }, [state, router])

  // Fetch jobs for the dropdown
  useEffect(() => {
    fetch('/api/jobs').then(r => r.json()).then(setJobs).catch(() => {})
  }, [])

  // Load template if query param is present
  useEffect(() => {
    if (!templateId) return
    setLoadingTpl(true)
    fetch(`/api/toolbox-templates/${templateId}`)
      .then(r => r.json())
      .then((t: Template) => {
        setTitle(t.title)
        setTopic(t.topic ?? '')
        setContent(t.content)
      })
      .catch(() => {})
      .finally(() => setLoadingTpl(false))
  }, [templateId])

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl">
      <Link href="/toolbox" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Toolbox Talks
      </Link>
      <h1 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl">
        {loadingTpl ? 'Loading template…' : 'New Toolbox Talk'}
      </h1>

      <form action={formAction} className="space-y-5">
        {/* Hidden fields for controlled values */}
        <input type="hidden" name="title"   value={title} />
        <input type="hidden" name="topic"   value={topic} />
        <input type="hidden" name="content" value={content} />

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Fall Protection"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Topic */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Topic / Category</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Fall Hazards, Electrical Safety"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Date + Conducted by */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                name="talk_date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Conducted By</label>
              <input
                name="conducted_by"
                placeholder="Supervisor name"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Job */}
          {jobs.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Job Site (optional)</label>
              <select
                name="job_id"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">No job selected</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Talk Content</label>
            <Link
              href="/toolbox/templates"
              className="text-xs font-medium text-orange-600 hover:text-orange-800"
            >
              Browse templates →
            </Link>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={18}
            placeholder="Paste or type your toolbox talk content here. Workers will see this when they open the sign link."
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono leading-relaxed"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{state.error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Link
            href="/toolbox"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Talk & Get QR Code
          </button>
        </div>
      </form>
    </div>
  )
}
