'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type SignupState = { error: string } | null

export async function signUp(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const fullName   = (formData.get('full_name') as string)?.trim()
  const email      = (formData.get('email') as string)?.trim()
  const password   = (formData.get('password') as string)?.trim()
  const company    = (formData.get('company') as string)?.trim()

  if (!fullName)  return { error: 'Full name is required' }
  if (!email)     return { error: 'Email is required' }
  if (!password)  return { error: 'Password is required' }
  if (!company)   return { error: 'Company name is required' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }

  const admin = createAdminClient()

  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const trialStartedAt = new Date()
  const trialEndsAt    = new Date(trialStartedAt.getTime() + 14 * 24 * 60 * 60 * 1000)

  // Create organization with trial
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({
      name:             company,
      slug,
      trial_started_at: trialStartedAt.toISOString(),
      trial_ends_at:    trialEndsAt.toISOString(),
      trial_status:     'trialing',
    })
    .select('id')
    .single()

  if (orgErr) {
    if (orgErr.message.includes('unique') || orgErr.code === '23505') {
      return { error: 'A company with that name already exists. Try adding your location (e.g. "Acme - Denver").' }
    }
    return { error: orgErr.message }
  }

  // Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authErr) {
    await admin.from('organizations').delete().eq('id', org.id)
    if (authErr.message.toLowerCase().includes('already registered') || authErr.message.toLowerCase().includes('already exists')) {
      return { error: 'An account with that email already exists. Sign in instead.' }
    }
    return { error: authErr.message }
  }

  // Create profile
  const { error: profileErr } = await admin.from('profiles').insert({
    id:              authData.user.id,
    organization_id: org.id,
    role:            'owner',
    full_name:       fullName,
  })

  if (profileErr) {
    await admin.auth.admin.deleteUser(authData.user.id)
    await admin.from('organizations').delete().eq('id', org.id)
    return { error: profileErr.message }
  }

  // Sign them in (sets session cookies via SSR client)
  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })

  if (signInErr) {
    return { error: 'Account created but sign-in failed. Please go to /login and sign in manually.' }
  }

  redirect('/dashboard')
}
