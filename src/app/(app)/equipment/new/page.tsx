import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { EquipmentCreateForm } from './EquipmentCreateForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewEquipmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()

  const admin = createAdminClient()
  const [{ data: equipmentTypes }, { data: jobs }, { data: workers }, { data: systemTemplates }, { data: orgTemplates }] = await Promise.all([
    supabase.from('equipment_types').select('id, name, category').order('category').order('name'),
    supabase.from('jobs').select('id, name').eq('organization_id', profile!.organization_id).eq('status', 'active').order('name'),
    supabase.from('workers').select('id, first_name, last_name').eq('organization_id', profile!.organization_id).eq('status', 'active').order('last_name'),
    admin.from('equipment_inspection_templates').select('id, title').is('organization_id', null).order('title'),
    supabase.from('equipment_inspection_templates').select('id, title').eq('organization_id', profile!.organization_id).order('title'),
  ])
  const inspectionTemplates = [...(systemTemplates ?? []), ...(orgTemplates ?? [])]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href="/equipment" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Equipment
        </Link>
      </div>
      <PageHeader title="Add Equipment" description="Register a new piece of equipment for tracking and inspections." />
      <div className="max-w-2xl">
        <EquipmentCreateForm
          equipmentTypes={equipmentTypes ?? []}
          jobs={jobs ?? []}
          workers={workers ?? []}
          inspectionTemplates={inspectionTemplates}
        />
      </div>
    </div>
  )
}
