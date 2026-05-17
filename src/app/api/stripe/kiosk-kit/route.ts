import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function GET(req: Request) {
  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const origin = `${proto}://${host}`

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_KIOSK_KIT_PRICE_ID) {
    return NextResponse.redirect(`${origin}/attendance?kiosk_kit=unavailable`)
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${origin}/login`)

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.redirect(`${origin}/login`)

    const { data: org } = await supabase
      .from('organizations')
      .select('name, stripe_customer_id')
      .eq('id', profile.organization_id)
      .single()

    const { searchParams } = new URL(req.url)
    const qty = Math.max(1, Math.min(20, parseInt(searchParams.get('qty') ?? '1')))

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as never })

    let customerId = org?.stripe_customer_id ?? undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org?.name,
        metadata: { organization_id: profile.organization_id },
      })
      customerId = customer.id
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.organization_id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: process.env.STRIPE_KIOSK_KIT_PRICE_ID, quantity: qty }],
      success_url: `${origin}/attendance?kiosk_kit=ordered`,
      cancel_url: `${origin}/attendance`,
      metadata: {
        organization_id: profile.organization_id,
        type: 'kiosk_kit',
        quantity: String(qty),
      },
      payment_intent_data: {
        metadata: {
          organization_id: profile.organization_id,
          type: 'kiosk_kit',
        },
      },
    })

    return NextResponse.redirect(session.url!)
  } catch (err) {
    console.error('Kiosk kit checkout error:', err)
    return NextResponse.redirect(`${origin}/attendance?kiosk_kit=error`)
  }
}
