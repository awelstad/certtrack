import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, Award, ShieldCheck, MapPin, QrCode, HardHat } from 'lucide-react'
import type { JobStatus } from '@/lib/types'

const statusVariant: Record<JobStatus, 'green' | 'slate' | 'red' | 'yellow'> = {
  active: 'green',
  completed: 'slate',
  on_hold: 'yellow',
  cancelled: 'red',
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()

  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .single()
  if (!job) notFound()

  const location = [job.address, job.city, job.state, job.zip].filter(Boolean).join(', ')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/jobs" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Jobs
        </Link>
      </div>

      {/* Job header */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{job.name}</h1>
            {location && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </p>
            )}
          </div>
          <Badge label={job.status.replace('_', ' ')} variant={statusVariant[job.status as JobStatus]} />
        </div>
        {(job.start_date || job.end_date) && (
          <p className="mt-3 text-sm text-slate-500">
            {job.start_date && `Start: ${job.start_date}`}
            {job.start_date && job.end_date && ' · '}
            {job.end_date && `End: ${job.end_date}`}
          </p>
        )}
      </div>

      {/* Sub-pages */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href={`/jobs/${id}/requirements`}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Award className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Requirements</p>
            <p className="text-sm text-slate-500">Cert types required for this job</p>
          </div>
        </Link>

        <Link
          href={`/jobs/${id}/compliance`}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
            <ShieldCheck className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Compliance</p>
            <p className="text-sm text-slate-500">Worker clearance status</p>
          </div>
        </Link>

        <Link
          href={`/jobs/${id}/orientation`}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
            <QrCode className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Site Orientation</p>
            <p className="text-sm text-slate-500">QR video + safety quiz</p>
          </div>
        </Link>

        <Link
          href={`/jobs/${id}/subs`}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
            <HardHat className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Subcontractors</p>
            <p className="text-sm text-slate-500">Invite & manage subs</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
