import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { JhaStatusBadge } from '@/components/jha/JhaStatusBadge'
import { JhaStepHazardControlTable } from '@/components/jha/JhaStepHazardControlTable'
import { JhaAttendeeList } from '@/components/jha/JhaAttendeeList'
import { JhaPdfExportButton } from '@/components/jha/JhaPdfExportButton'
import { JhaDetailActions } from './JhaDetailActions'
import { parseFieldValues } from '@/lib/jha'
import { ArrowLeft, Edit2, PenLine, QrCode } from 'lucide-react'
import { headers } from 'next/headers'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function JhaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const { data: jha } = await supabase
    .from('jhas')
    .select('id, title, status, work_date, work_description, work_area, field_values, job_id, jobs(name)')
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!jha) notFound()

  const { data: signatures } = await supabase
    .from('jha_signatures')
    .select('id, printed_name, signature_data, worker_identifier, signed_at')
    .eq('jha_id', id)
    .order('signed_at', { ascending: true })

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const signUrl = `${protocol}://${host}/jha/${id}/sign`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(signUrl)}&margin=4&color=0f172a`

  const fv = parseFieldValues(jha.field_values as Record<string, unknown> | null)
  const job = jha.jobs as unknown as { name: string } | null
  const isManager = MANAGER_ROLES.includes(profile?.role as Role)
  const isLocked = jha.status === 'completed' || jha.status === 'archived'

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href="/jha" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Job Hazard Analysis
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{jha.title}</h1>
            <JhaStatusBadge status={jha.status} />
          </div>
          <p className="text-sm text-slate-500">
            {job?.name ?? 'No job assigned'}
            {jha.work_date && ` · ${new Date(jha.work_date).toLocaleDateString()}`}
            {jha.work_area && ` · ${jha.work_area}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <JhaPdfExportButton jhaId={id} />
          {!isLocked && isManager && (
            <Link
              href={`/jha/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Link>
          )}
          <Link
            href={`/jha/${id}/sign`}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
          >
            <PenLine className="h-4 w-4" />
            Sign JHA
          </Link>
        </div>
      </div>

      {/* Manager actions */}
      {isManager && (
        <div className="mb-6">
          <JhaDetailActions jhaId={id} status={jha.status} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Info summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Job Information</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                { label: 'Company',    value: fv.company },
                { label: 'Supervisor', value: fv.supervisor },
                { label: 'Foreman',    value: fv.foreman },
                { label: 'Weather',    value: fv.weather },
              ].map(({ label, value }) => value ? (
                <div key={label}>
                  <dt className="font-medium text-slate-500">{label}</dt>
                  <dd className="text-slate-900">{value}</dd>
                </div>
              ) : null)}
              {jha.work_description && (
                <div className="col-span-2">
                  <dt className="font-medium text-slate-500">Work Activity</dt>
                  <dd className="text-slate-900">{jha.work_description}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Steps / Hazards / Controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Steps, Hazards &amp; Controls</h2>
            <JhaStepHazardControlTable steps={fv.steps} />
          </div>

          {/* PPE */}
          {fv.ppe.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Required PPE</h2>
              <div className="flex flex-wrap gap-2">
                {fv.ppe.map((item) => (
                  <span key={item} className="rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-sm font-medium text-orange-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tools */}
          {fv.tools && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Tools &amp; Equipment</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{fv.tools}</p>
            </div>
          )}

          {/* Emergency */}
          {(fv.emergency_contact || fv.emergency_notes) && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-red-800">Emergency Information</h2>
              {fv.emergency_contact && (
                <p className="text-sm font-medium text-red-700">Contact: {fv.emergency_contact}</p>
              )}
              {fv.emergency_notes && (
                <p className="mt-1 text-sm text-red-600 whitespace-pre-wrap">{fv.emergency_notes}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {fv.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Notes</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{fv.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar: signatures + QR */}
        <div className="space-y-6">
          {/* QR code to sign */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <QrCode className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700">Sign via QR</h2>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="QR to sign JHA" width={120} height={120} className="mx-auto rounded-lg" />
            <p className="mt-2 text-xs text-slate-500">Workers scan to sign on their device</p>
          </div>

          {/* Signatures */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-700">
                Attendees ({signatures?.length ?? 0})
              </h2>
            </div>
            <div className="px-5 py-3">
              <JhaAttendeeList signatures={signatures ?? []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
