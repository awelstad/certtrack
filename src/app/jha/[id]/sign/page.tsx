import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicJhaSignForm } from './PublicJhaSignForm'
import { ClipboardList, HardHat } from 'lucide-react'

export default async function PublicJhaSignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: jha } = await supabase
    .from('jhas')
    .select('id, title, status, work_date, work_description, work_area, organization_id, jobs(name)')
    .eq('id', id)
    .single()

  if (!jha) notFound()

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, brand_color')
    .eq('id', jha.organization_id)
    .single()

  const brandColor = org?.brand_color ?? '#f97316'
  const job = jha.jobs as unknown as { name: string } | null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="h-8 w-auto object-contain" />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: brandColor }}
            >
              <HardHat className="h-5 w-5 text-white" />
            </div>
          )}
          <span className="font-semibold text-slate-900">{org?.name ?? 'CertTrack'}</span>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
        {/* JHA summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
          </div>
        </div>

        {/* Sign form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm font-medium text-slate-700">
            By signing below, I confirm I have reviewed the hazards and controls described in this JHA.
          </p>
          <PublicJhaSignForm jhaId={id} />
        </div>
      </div>
    </div>
  )
}
