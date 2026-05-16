import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidPlan } from '@/lib/plans'

const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  pro:     process.env.STRIPE_PRO_PRICE_ID,
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://certtrack-kappa.vercel.app'

export async function GET(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' })
  const plan = req.nextUrl.searchParams.get('plan') ?? ''

  if (!isValidPlan(plan) || plan === 'free') {
    return NextResponse.redirect(`${APP_URL}/dashboard`)
  }

  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
  }

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
    .select('name, stripe_customer_id')
    .eq('id', profile.organization_id)
    .single()

  let customerId = org?.stripe_customer_id as string | null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name ?? undefined,
      metadata: { org_id: profile.organization_id },
    })
    customerId = customer.id
    await admin.from('organizations').update({ stripe_customer_id: customerId }).eq('id', profile.organization_id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/dashboard?upgraded=1`,
    cancel_url:  `${APP_URL}/dashboard`,
    metadata: { org_id: profile.organization_id, plan },
    subscription_data: { metadata: { org_id: profile.organization_id, plan } },
  })

  return NextResponse.redirect(session.url!)
}
