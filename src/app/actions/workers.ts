'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAuditLog } from '@/lib/audit'
import { getPlan, PLAN_LIMITS } from '@/lib/plans'
import { headers } from 'next/headers'
import type { Role } from '@/lib/types'

async function getBaseUrl(): Promise<string> {
  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const proto = hdrs.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

async function sendPortalInviteEmail(workerEmail: string, workerName: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  const baseUrl = await getBaseUrl()
  const portalUrl = `${baseUrl}/worker`
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Clearwork <onboarding@resend.dev>',
      to: workerEmail,
      subject: 'Your Clearwork Worker Portal Invitation',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h1 style="color:#0f172a;font-size:22px;margin:0 0 8px">You've been added to Clearwork</h1>
          <p style="color:#374151;font-size:14px">Hi ${workerName},</p>
          <p style="color:#374151;font-size:14px">Your employer has added you to Clearwork. You can now access the worker portal to view your certifications, upload new ones, and track your orientation history.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${portalUrl}"
               style="display:inline-block;background:#0f172a;color:white;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px">
              Access Worker Portal →
            </a>
          </div>
          <p style="color:#6b7280;font-size:13px">You'll log in with this email address (${workerEmail}) using a magic link — no password required.</p>
          <p style="color:#94a3b8;font-size:12px;text-align:center">Powered by Clearwork</p>
        </div>
      `,
    }),
  }).catch(() => {})
}

const MANAGER_ROLES: Role[] = ['platform_admin', 'owner', 'admin', 'pm', 'superintendent']
const EDIT_ROLES:    Role[] = ['platform_admin', 'owner', 'admin', 'pm', 'superintendent']

export async function createWorker(
  _prev: { error?: string; workerId?: string } | null,
  formData: FormData
): Promise<{ error?: string; workerId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) {
    return { error: 'Insufficient permissions' }
  }

  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName  = (formData.get('last_name') as string)?.trim()
  if (!firstName) return { error: 'First name is required' }
  if (!lastName)  return { error: 'Last name is required' }

  // Plan limit check
  const { data: orgData } = await supabase.from('organizations').select('plan').eq('id', profile.organization_id).single()
  const limits = PLAN_LIMITS[getPlan(orgData?.plan)]
  if (limits.workers < Infinity) {
    const { count } = await supabase
      .from('workers')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
      .eq('status', 'active')
    if ((count ?? 0) >= limits.workers) {
      return { error: `Your free plan allows up to ${limits.workers} active workers. Upgrade to add more.` }
    }
  }

  const email       = (formData.get('email') as string)?.trim() || null
  const sendInvite  = formData.get('send_portal_invite') === 'on' && Boolean(email)

  const { data, error } = await supabase
    .from('workers')
    .insert({
      organization_id:        profile.organization_id,
      first_name:             firstName,
      last_name:              lastName,
      email,
      phone:                  (formData.get('phone') as string)?.trim() || null,
      trade:                  (formData.get('trade') as string)?.trim() || null,
      employer:               (formData.get('employer') as string)?.trim() || null,
      status:                 'active' as const,
      portal_invite_sent_at:  sendInvite ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'worker_created',
    entityType: 'worker',
    entityId: data.id,
    metadata: { name: `${firstName} ${lastName}` },
  })

  if (sendInvite && email) {
    // Pre-create the auth account so the magic link flow works
    const admin = createAdminClient()
    await admin.auth.admin.createUser({ email, email_confirm: true }).catch(() => {})
    await sendPortalInviteEmail(email, `${firstName} ${lastName}`)
  }

  revalidatePath('/workers')
  return { workerId: data.id }
}

export async function updateWorker(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !EDIT_ROLES.includes(profile.role as Role)) {
    return { error: 'Insufficient permissions' }
  }

  const workerId  = (formData.get('worker_id') as string)?.trim()
  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName  = (formData.get('last_name') as string)?.trim()

  if (!workerId)  return { error: 'Worker ID missing' }
  if (!firstName) return { error: 'First name is required' }
  if (!lastName)  return { error: 'Last name is required' }

  const { error } = await supabase
    .from('workers')
    .update({
      first_name: firstName,
      last_name:  lastName,
      email:      (formData.get('email') as string)?.trim() || null,
      phone:      (formData.get('phone') as string)?.trim() || null,
      trade:      (formData.get('trade') as string)?.trim() || null,
      employer:   (formData.get('employer') as string)?.trim() || null,
      status:     (formData.get('status') as string) || 'active',
    })
    .eq('id', workerId)
    .eq('organization_id', profile.organization_id)

  if (error) return { error: error.message }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'worker_created',
    entityType: 'worker',
    entityId: workerId,
    metadata: { name: `${firstName} ${lastName}` },
  })

  revalidatePath(`/workers/${workerId}`)
  revalidatePath('/workers')
  return { success: true }
}
