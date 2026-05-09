'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'

const ADMIN_ROLES: Role[] = ['owner', 'admin']

export async function updateBranding(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !ADMIN_ROLES.includes(profile.role as Role)) {
    return { error: 'Insufficient permissions' }
  }

  const name       = (formData.get('name') as string)?.trim() || null
  const brandColor = (formData.get('brandColor') as string) || null
  const logoUrl    = (formData.get('logoUrl') as string) || null

  const updates: Record<string, string | null> = {}
  if (name)       updates.name        = name
  if (brandColor) updates.brand_color = brandColor
  // logoUrl may be empty string to clear the logo
  if (formData.has('logoUrl')) updates.logo_url = logoUrl

  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', profile.organization_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/branding')
  revalidatePath('/') // propagate to badge/qr pages via ISR
  return {}
}
