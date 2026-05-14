import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { BrandingForm } from './BrandingForm'
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
    .select('id, name, slug, logo_url, brand_color')
    .eq('id', profile!.organization_id)
    .single()

  if (!org) notFound()

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Settings"
        description="Customize your organization's logo, name, and brand color."
      />
      <BrandingForm
        orgId={org.id}
        initialName={org.name}
        initialSlug={org.slug}
        initialLogoUrl={org.logo_url ?? null}
        initialBrandColor={org.brand_color ?? null}
      />
    </div>
  )
}
