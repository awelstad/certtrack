'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getBaseUrl(): Promise<string> {
  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const proto = hdrs.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

async function generateWorkerNumber(orgId: string): Promise<string> {
  const admin = createAdminClient()
  const { data: org } = await admin.from('organizations').select('slug').eq('id', orgId).single()
  const prefix = (org?.slug ?? 'wkr').toUpperCase().replace(/-/g, '').substring(0, 3)

  const { data: existing } = await admin
    .from('profiles')
    .select('worker_number')
    .eq('organization_id', orgId)
    .not('worker_number', 'is', null)

  let maxNum = 0
  for (const p of existing ?? []) {
    const match = p.worker_number?.match(/(\d+)$/)
    if (match) maxNum = Math.max(maxNum, parseInt(match[1]))
  }
  return `W-${prefix}-${String(maxNum + 1).padStart(4, '0')}`
}

function generatePassId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let a = '', b = ''
  for (let i = 0; i < 4; i++) a += chars[Math.floor(Math.random() * chars.length)]
  for (let i = 0; i < 4; i++) b += chars[Math.floor(Math.random() * chars.length)]
  return `ORI-${a}-${b}`
}

// ── Send magic link ───────────────────────────────────────────────────────────

export async function startOrientationAuth(data: {
  fullName: string
  email: string
  phone: string
  jobId: string
  jobName: string
}): Promise<{ error?: string; sent?: boolean }> {
  const email = data.email.trim().toLowerCase()
  if (!email) return { error: 'Email is required' }
  if (!data.fullName.trim()) return { error: 'Full name is required' }

  const admin = createAdminClient()
  const baseUrl = await getBaseUrl()
  const redirectTo = `${baseUrl}/auth/callback?next=/o/${data.jobId}`

  // Create user if they don't exist yet (ignore "already registered" error)
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: data.fullName.trim(), phone: data.phone?.trim() || null },
  })
  if (createErr && !createErr.message.toLowerCase().includes('already')) {
    return { error: createErr.message }
  }

  // Generate magic link
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })
  if (linkErr || !linkData?.properties?.action_link) {
    return { error: linkErr?.message ?? 'Could not generate login link' }
  }

  const actionLink = linkData.properties.action_link

  // Send custom email via Resend
  if (process.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Clearwork <onboarding@resend.dev>',
        to: email,
        subject: `Your orientation link — ${data.jobName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <div style="text-align:center;margin-bottom:24px">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;background:#fff7ed">
                <span style="font-size:28px">🦺</span>
              </div>
              <h1 style="color:#0f172a;font-size:22px;margin:12px 0 4px">Site Orientation Access</h1>
              <p style="color:#64748b;margin:0;font-size:14px">${data.jobName}</p>
            </div>
            <p style="color:#374151;font-size:14px">Hi ${data.fullName.trim()},</p>
            <p style="color:#374151;font-size:14px">Click below to continue your site orientation. This link expires in 1 hour and can only be used once.</p>
            <div style="text-align:center;margin:28px 0">
              <a href="${actionLink}"
                 style="display:inline-block;background:#f97316;color:white;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px">
                Continue Orientation →
              </a>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    }).catch(() => {})
  }

  return { sent: true }
}

// ── Create worker profile after magic link auth ───────────────────────────────

export async function completeWorkerProfile(data: {
  orgId: string
}): Promise<{ error?: string; workerNumber?: string; fullName?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // If profile already exists, return existing worker number
  const { data: existing } = await admin
    .from('profiles')
    .select('worker_number, full_name')
    .eq('id', user.id)
    .single()
  if (existing) return { workerNumber: existing.worker_number ?? undefined, fullName: existing.full_name ?? undefined }

  const meta = user.user_metadata ?? {}
  const fullName = (meta.full_name as string | undefined)?.trim() || user.email?.split('@')[0] || 'Worker'
  const phone = (meta.phone as string | undefined) || null

  const workerNumber = await generateWorkerNumber(data.orgId)

  const { error } = await admin.from('profiles').insert({
    id: user.id,
    organization_id: data.orgId,
    role: 'worker',
    full_name: fullName,
    phone,
    worker_number: workerNumber,
  })
  if (error) return { error: error.message }

  return { workerNumber, fullName }
}

// ── Save orientation session progress ─────────────────────────────────────────

export async function saveOrientationProgress(data: {
  orientationId: string
  jobId: string
  organizationId: string
  step: string
  answers?: Record<string, number>
  employer?: string
  employerType?: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('orientation_sessions')
    .upsert(
      {
        worker_id:       user.id,
        orientation_id:  data.orientationId,
        job_id:          data.jobId,
        organization_id: data.organizationId,
        step:            data.step,
        answers:         data.answers ?? {},
        employer:        data.employer ?? null,
        employer_type:   data.employerType ?? null,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'worker_id,orientation_id' }
    )

  if (error) return { error: error.message }
  return {}
}

// ── Complete orientation and issue pass ───────────────────────────────────────

export async function completeOrientationWithPass(data: {
  orientationId: string
  jobId: string
  organizationId: string
  workerName: string
  workerEmail: string
  employer: string
  employerType: string
  score: number
  passed: boolean
  answers: number[]
}): Promise<{ error?: string; passId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Return existing pass if they already passed
  const { data: existing } = await admin
    .from('orientation_completions')
    .select('pass_id')
    .eq('worker_profile_id', user.id)
    .eq('orientation_id', data.orientationId)
    .eq('passed', true)
    .maybeSingle()
  if (existing?.pass_id) return { passId: existing.pass_id }

  // Generate unique pass ID (retry on collision)
  let passId = generatePassId()
  for (let i = 0; i < 3; i++) {
    const { data: collision } = await admin
      .from('orientation_completions')
      .select('id')
      .eq('pass_id', passId)
      .maybeSingle()
    if (!collision) break
    passId = generatePassId()
  }

  const { error } = await admin.from('orientation_completions').insert({
    orientation_id:    data.orientationId,
    job_id:            data.jobId,
    organization_id:   data.organizationId,
    worker_name:       data.workerName,
    worker_profile_id: user.id,
    worker_email:      data.workerEmail,
    employer:          data.employer,
    employer_type:     data.employerType,
    score:             data.score,
    passed:            data.passed,
    answers:           data.answers,
    pass_id:           data.passed ? passId : null,
  })
  if (error) return { error: error.message }

  // Send pass email
  if (data.passed && process.env.RESEND_API_KEY) {
    const baseUrl = await getBaseUrl()
    const verifyUrl = `${baseUrl}/verify/${passId}`
    const { data: job } = await admin.from('jobs').select('name').eq('id', data.jobId).single()
    const jobName = job?.name ?? 'Your Job Site'
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Clearwork <onboarding@resend.dev>',
        to: data.workerEmail,
        subject: `Orientation Pass — ${jobName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <div style="text-align:center;margin-bottom:24px">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:#dcfce7;margin-bottom:12px">
                <span style="font-size:36px">✓</span>
              </div>
              <h1 style="color:#166534;font-size:24px;margin:0">Orientation Complete!</h1>
              <p style="color:#6b7280;margin-top:6px;font-size:14px">You are cleared for ${jobName}</p>
            </div>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:7px 0;color:#64748b;font-size:14px">Name</td><td style="padding:7px 0;font-size:14px;font-weight:600;text-align:right">${data.workerName}</td></tr>
                <tr><td style="padding:7px 0;color:#64748b;font-size:14px">Employer</td><td style="padding:7px 0;font-size:14px;text-align:right">${data.employer}</td></tr>
                <tr><td style="padding:7px 0;color:#64748b;font-size:14px">Job Site</td><td style="padding:7px 0;font-size:14px;text-align:right">${jobName}</td></tr>
                <tr><td style="padding:7px 0;color:#64748b;font-size:14px">Score</td><td style="padding:7px 0;font-size:14px;text-align:right">${data.score}%</td></tr>
                <tr><td style="padding:7px 0;color:#64748b;font-size:14px">Date</td><td style="padding:7px 0;font-size:14px;text-align:right">${dateStr}</td></tr>
              </table>
            </div>

            <div style="background:#fff7ed;border:2px solid #fb923c;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
              <p style="color:#9a3412;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px">Your Pass ID</p>
              <p style="color:#ea580c;font-size:30px;font-weight:800;letter-spacing:0.15em;margin:0;font-family:monospace">${passId}</p>
              <p style="color:#9a3412;font-size:12px;margin:10px 0 0">Show this to your site safety manager to receive your sticker</p>
            </div>

            <div style="text-align:center;margin-bottom:20px">
              <a href="${verifyUrl}"
                 style="display:inline-block;background:#f97316;color:white;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px">
                View &amp; Verify My Pass →
              </a>
            </div>

            <p style="color:#94a3b8;font-size:11px;text-align:center">
              Safety managers can verify your pass at:<br>
              <a href="${verifyUrl}" style="color:#f97316">${verifyUrl}</a>
            </p>
          </div>
        `,
      }),
    }).catch(() => {})
  }

  // Clean up the session now that it's complete
  await admin
    .from('orientation_sessions')
    .delete()
    .eq('worker_id', user.id)
    .eq('orientation_id', data.orientationId)

  return { passId: data.passed ? passId : undefined }
}
