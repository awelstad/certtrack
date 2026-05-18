import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { BrandingForm } from './BrandingForm'
import { WorkerPortalSettings } from './WorkerPortalSettings'
import type { Role } from '@/lib/types'

export default async function AdminBrandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const role = profile?.role as Role | undefined
  if (role !== 'owner' && role !== 'admin') notFound()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, brand_color, workers_can_upload_certs')
    .eq('id', profile!.organization_id)
    .single()

  if (!org) notFound()

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Settings"
        description="Customize your organization's logo, name, and brand color."
      />
      <div className="space-y-6">
        <BrandingForm
          orgId={org.id}
          initialName={org.name}
          initialSlug={org.slug}
          initialLogoUrl={org.logo_url ?? null}
          initialBrandColor={org.brand_color ?? null}
        />
        <div className="max-w-xl">
          <WorkerPortalSettings
            initialWorkersCanUploadCerts={org.workers_can_upload_certs ?? true}
          />
        </div>
      </div>
    </div>
  )
}
