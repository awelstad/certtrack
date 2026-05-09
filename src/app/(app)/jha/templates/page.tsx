import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ArrowLeft, LayoutTemplate, Plus, ChevronRight } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function JhaTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) notFound()

  const { data: templates } = await supabase
    .from('jha_templates')
    .select('id, title, description, default_steps, default_ppe')
    .eq('organization_id', profile.organization_id)
    .order('title')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href="/jha" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Job Hazard Analysis
        </Link>
      </div>
      <PageHeader
        title="JHA Templates"
        description="Reusable templates with pre-configured steps, hazards, and PPE."
        action={
          <Link
            href="/jha/templates/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            New Template
          </Link>
        }
      />

      {!templates?.length ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No templates yet"
          description="Create a template to speed up JHA creation with pre-filled steps, hazards, and PPE checklists."
          action={
            <Link
              href="/jha/templates/new"
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
              const steps = (t.default_steps as unknown as { id: string }[]) ?? []
              const ppe   = (t.default_ppe   as unknown as string[]) ?? []
              return (
                <li key={t.id}>
                  <Link
                    href={`/jha/new?template=${t.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <LayoutTemplate className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{t.title}</p>
                      <p className="text-sm text-slate-500">
                        {steps.length} step{steps.length !== 1 ? 's' : ''}
                        {ppe.length > 0 && ` · ${ppe.length} PPE items`}
                        {t.description && ` · ${t.description}`}
                      </p>
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
