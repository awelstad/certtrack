import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { JhaTemplateForm } from './JhaTemplateForm'
import { ArrowLeft } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function NewJhaTemplatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) notFound()

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href="/jha/templates" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Templates
        </Link>
      </div>
      <PageHeader
        title="New Template"
        description="Define reusable steps, hazards, controls, and PPE for recurring job types."
      />
      <div className="max-w-3xl">
        <JhaTemplateForm />
      </div>
    </div>
  )
}
