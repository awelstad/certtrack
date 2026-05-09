import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { JhaCreateForm } from './JhaCreateForm'
import { ArrowLeft } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function NewJhaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) notFound()

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

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href="/jha" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Job Hazard Analysis
        </Link>
      </div>
      <PageHeader title="New JHA" description="Fill in the details, steps, hazards, and controls." />
      <div className="max-w-3xl">
        <JhaCreateForm jobs={jobs ?? []} templates={templates ?? []} />
      </div>
    </div>
  )
}
