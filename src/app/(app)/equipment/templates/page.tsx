import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ClipboardList, Plus, ChevronRight } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function InspectionTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) notFound()

  const { data: templates } = await supabase
    .from('equipment_inspection_templates')
    .select('id, title, description, checklist_items, equipment_types(name)')
    .eq('organization_id', profile.organization_id)
    .order('title')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Inspection Templates"
        description="Reusable checklists for equipment inspections."
        action={
          <Link
            href="/equipment/templates/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            New Template
          </Link>
        }
      />

      {!templates?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No templates yet"
          description="Create inspection templates to standardize your equipment checks."
          action={
            <Link
              href="/equipment/templates/new"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              New Template
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {templates.map((t) => {
              const eqType = t.equipment_types as unknown as { name: string } | null
              const itemCount = Array.isArray(t.checklist_items) ? t.checklist_items.length : 0
              return (
                <li key={t.id}>
                  <Link
                    href={`/equipment/templates/${t.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                      <ClipboardList className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{t.title}</p>
                      <p className="truncate text-sm text-slate-500">
                        {eqType?.name ?? 'All equipment types'} · {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </p>
                      {t.description && (
                        <p className="truncate text-xs text-slate-400 mt-0.5">{t.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
