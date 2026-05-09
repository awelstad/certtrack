import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { TemplateEditForm } from './TemplateEditForm'
import { parseChecklistTemplate } from '@/lib/equipment'
import { ArrowLeft } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function TemplateDetailPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) notFound()

  const { data: template } = await supabase
    .from('equipment_inspection_templates')
    .select('id, title, description, equipment_type_id, checklist_items')
    .eq('id', templateId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!template) notFound()

  const { data: equipmentTypes } = await supabase
    .from('equipment_types')
    .select('id, name, category')
    .order('category')
    .order('name')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href="/equipment/templates" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </Link>
      </div>
      <PageHeader title="Edit Template" description="Update the checklist items and settings for this template." />
      <div className="max-w-2xl">
        <TemplateEditForm
          templateId={templateId}
          equipmentTypes={equipmentTypes ?? []}
          initialValues={{
            title:           template.title,
            description:     template.description ?? '',
            equipmentTypeId: template.equipment_type_id ?? '',
            items:           parseChecklistTemplate(template.checklist_items),
          }}
        />
      </div>
    </div>
  )
}
