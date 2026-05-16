import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://certtrack-kappa.vercel.app'

export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/login`)

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.redirect(`${APP_URL}/login`)

  const { data: org } = await admin
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', profile.organization_id)
    .single()

  const customerId = org?.stripe_customer_id as string | null
  if (!customerId) {
    return NextResponse.redirect(`${APP_URL}/dashboard`)
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${APP_URL}/dashboard`,
  })

  return NextResponse.redirect(session.url)
}
