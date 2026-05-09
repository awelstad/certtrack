import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { JhaStatusBadge } from '@/components/jha/JhaStatusBadge'
import { JhaAttendeeList } from '@/components/jha/JhaAttendeeList'
import { JhaSignForm } from './JhaSignForm'
import { ArrowLeft, ClipboardList } from 'lucide-react'

export default async function JhaSignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: jha } = await supabase
    .from('jhas')
    .select('id, title, status, work_date, work_description, work_area, jobs(name)')
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!jha) notFound()

  const { data: signatures } = await supabase
    .from('jha_signatures')
    .select('id, printed_name, signature_data, worker_identifier, signed_at')
    .eq('jha_id', id)
    .order('signed_at', { ascending: true })

  const { data: workers } = await supabase
    .from('workers')
    .select('id, first_name, last_name, trade')
    .eq('organization_id', profile!.organization_id)
    .eq('status', 'active')
    .order('last_name')

  const job = jha.jobs as unknown as { name: string } | null

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-xl">
        {/* Back link */}
        <div className="mb-4">
          <Link href={`/jha/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to JHA
          </Link>
        </div>

        {/* JHA summary */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
              <ClipboardList className="h-5 w-5 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{jha.title}</p>
              <p className="text-sm text-slate-500">
                {job?.name ?? 'No job assigned'}
                {jha.work_date && ` · ${new Date(jha.work_date).toLocaleDateString()}`}
              </p>
              {jha.work_description && (
                <p className="mt-1.5 text-sm text-slate-600">{jha.work_description}</p>
              )}
            </div>
            <JhaStatusBadge status={jha.status} className="shrink-0" />
          </div>
        </div>

        {/* Sign form */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-slate-900">
            I have reviewed the hazards and controls described in this JHA.
          </h2>
          <JhaSignForm jhaId={id} workers={workers ?? []} />
        </div>

        {/* Existing signatures */}
        {(signatures?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-700">
                Already signed ({signatures!.length})
              </h2>
            </div>
            <div className="px-5 py-3">
              <JhaAttendeeList signatures={signatures!} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
