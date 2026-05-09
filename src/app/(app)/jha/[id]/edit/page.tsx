import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { JhaEditForm } from './JhaEditForm'
import { parseFieldValues } from '@/lib/jha'
import { ArrowLeft } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function JhaEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) notFound()

  const { data: jha } = await supabase
    .from('jhas')
    .select('id, title, status, work_date, work_description, work_area, job_id, template_id, field_values')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!jha) notFound()
  if (jha.status === 'completed') redirect(`/jha/${id}`)

  const [{ data: jobs }, { data: templates }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('jha_templates')
      .select('id, title, default_steps, default_ppe')
      .eq('organization_id', profile.organization_id)
      .order('title'),
  ])

  const fv = parseFieldValues(jha.field_values as Record<string, unknown> | null)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href={`/jha/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to JHA
        </Link>
      </div>
      <PageHeader title="Edit JHA" description="Update the steps, hazards, controls, and other details." />
      <div className="max-w-3xl">
        <JhaEditForm
          jhaId={id}
          initialValues={{
            title:           jha.title,
            workDescription: jha.work_description ?? '',
            workArea:        jha.work_area ?? '',
            workDate:        jha.work_date ?? '',
            jobId:           jha.job_id ?? null,
            templateId:      jha.template_id ?? null,
            fieldValues:     fv,
          }}
          jobs={jobs ?? []}
          templates={templates ?? []}
        />
      </div>
    </div>
  )
}
