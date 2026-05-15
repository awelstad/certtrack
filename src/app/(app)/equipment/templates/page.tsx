import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ClipboardList, Plus, ChevronRight, Lock } from 'lucide-react'
import type { Role } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

type Template = {
  id: string
  title: string
  description: string | null
  checklist_items: unknown
}

export default async function InspectionTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) notFound()

  const admin = createAdminClient()
  const [{ data: orgTemplates }, { data: systemTemplates }] = await Promise.all([
    supabase
      .from('equipment_inspection_templates')
      .select('id, title, description, checklist_items')
      .eq('organization_id', profile.organization_id)
      .order('title'),
    admin
      .from('equipment_inspection_templates')
      .select('id, title, description, checklist_items')
      .is('organization_id', null)
      .order('title'),
  ])

  // Usage counts — column added in migration 015
  const usageMap: Record<string, number> = {}
  const { data: equipmentUsage } = await supabase
    .from('equipment')
    .select('inspection_template_id')
    .eq('organization_id', profile.organization_id)
    .not('inspection_template_id', 'is', null)
  for (const eq of equipmentUsage ?? []) {
    const tid = (eq as { inspection_template_id: string | null }).inspection_template_id
    if (tid) usageMap[tid] = (usageMap[tid] ?? 0) + 1
  }

  const hasOrg = (orgTemplates?.length ?? 0) > 0
  const hasSystem = (systemTemplates?.length ?? 0) > 0

  function itemCount(t: Template) {
    return Array.isArray(t.checklist_items) ? (t.checklist_items as unknown[]).length : 0
  }

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

      {!hasOrg && !hasSystem ? (
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
        <div className="space-y-6">
          {hasOrg && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Your Templates</h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                  {(orgTemplates as Template[]).map((t) => {
                    const count = itemCount(t)
                    const used = usageMap[t.id] ?? 0
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
                              {count} item{count !== 1 ? 's' : ''}{used > 0 ? ` · ${used} equipment` : ''}
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
            </div>
          )}

          {hasSystem && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">System Templates</h2>
              <p className="mb-3 text-xs text-slate-400">Built-in checklists available to all organizations. Assign them to equipment in the equipment form.</p>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                  {(systemTemplates as Template[]).map((t) => {
                    const count = itemCount(t)
                    const used = usageMap[t.id] ?? 0
                    return (
                      <li key={t.id} className="flex items-center gap-4 px-5 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <ClipboardList className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-slate-700">{t.title}</p>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              <Lock className="h-2.5 w-2.5" />
                              System
                            </span>
                          </div>
                          <p className="truncate text-sm text-slate-500">
                            {count} item{count !== 1 ? 's' : ''}{used > 0 ? ` · ${used} equipment` : ''}
                          </p>
                          {t.description && (
                            <p className="truncate text-xs text-slate-400 mt-0.5">{t.description}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
