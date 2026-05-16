import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidPlan } from '@/lib/plans'

async function updateOrgFromSubscription(sub: Stripe.Subscription, admin: ReturnType<typeof createAdminClient>) {
  const orgId = sub.metadata?.org_id
  if (!orgId) return

  const priceToplan: Record<string, string> = {
    [process.env.STRIPE_STARTER_PRICE_ID ?? '']: 'starter',
    [process.env.STRIPE_PRO_PRICE_ID ?? '']:     'pro',
  }

  const priceId = sub.items.data[0]?.price.id ?? ''
  const plan = priceToplan[priceId] ?? 'free'
  const periodEnd = new Date((sub.current_period_end ?? 0) * 1000).toISOString()

  await admin.from('organizations').update({
    plan,
    stripe_subscription_id: sub.id,
    billing_period_end: periodEnd,
  }).eq('id', orgId)
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' })

  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const orgId   = session.metadata?.org_id
      const plan    = session.metadata?.plan

      if (orgId && isValidPlan(plan)) {
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const subId      = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

        await admin.from('organizations').update({
          plan,
          stripe_customer_id:     customerId ?? null,
          stripe_subscription_id: subId ?? null,
        }).eq('id', orgId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.status === 'active' || sub.status === 'trialing') {
        await updateOrgFromSubscription(sub, admin)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const orgId = sub.metadata?.org_id
      if (orgId) {
        await admin.from('organizations').update({
          plan: 'free',
          stripe_subscription_id: null,
          billing_period_end: null,
        }).eq('id', orgId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
