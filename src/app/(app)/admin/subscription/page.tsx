import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { getPlan, PLAN_LABELS } from '@/lib/plans'
import type { Role } from '@/lib/types'
import {
  CheckCircle2, CreditCard, Package, Zap, Shield, ArrowRight, ExternalLink
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const PLAN_PRICES: Record<string, string> = {
  starter: '$49/mo',
  pro:     '$99/mo',
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    'Unlimited workers',
    'Unlimited equipment',
    'Unlimited JHAs',
    'Toolbox Talks',
    'Site Kiosk attendance',
    'QR code badges',
  ],
  pro: [
    'Everything in Starter',
    'Subcontractor portal',
    'Advanced compliance reports',
    'Priority support',
    'Custom branding',
    'Multi-job management',
  ],
}

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as Role | undefined
  if (role !== 'platform_admin' && role !== 'owner' && role !== 'admin') notFound()

  const admin = createAdminClient()
  const { data: org } = await admin
    .from('organizations')
    .select('name, plan, stripe_customer_id, billing_period_end')
    .eq('id', profile!.organization_id)
    .single()

  if (!org) notFound()

  const plan = getPlan(org.plan)
  const isPaid = plan !== 'free'
  const hasStripe = !!org.stripe_customer_id
  const renewalDate = org.billing_period_end
    ? new Date(org.billing_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl">
      <PageHeader
        title="Subscription"
        description="Manage your plan and billing"
      />

      {/* Current Plan */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Plan</p>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-2xl font-bold text-slate-900">{PLAN_LABELS[plan]}</p>
              {isPaid && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  Active
                </span>
              )}
              {!isPaid && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                  Free
                </span>
              )}
            </div>
            {renewalDate && (
              <p className="mt-1 text-sm text-slate-500">Renews {renewalDate}</p>
            )}
          </div>
          {isPaid && hasStripe && (
            <a
              href="/api/stripe/portal"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              Manage Billing
            </a>
          )}
        </div>

        {isPaid && (
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p>To cancel, update your card, or view invoices — click <strong>Manage Billing</strong> above. You&apos;ll be taken to the Stripe portal.</p>
          </div>
        )}
      </div>

      {/* Upgrade section — only shown on free plan */}
      {!isPaid && (
        <div className="mb-6">
          <p className="mb-4 text-sm font-semibold text-slate-700">Upgrade your plan</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Starter */}
            <div className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                <p className="text-base font-bold text-slate-900">Starter</p>
              </div>
              <p className="mb-4 text-2xl font-bold text-slate-900">
                {PLAN_PRICES.starter}
                <span className="text-sm font-normal text-slate-400"> / month</span>
              </p>
              <ul className="mb-6 space-y-2">
                {PLAN_FEATURES.starter.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/api/stripe/checkout?plan=starter"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* Pro */}
            <div className="relative rounded-xl border-2 border-orange-400 bg-white p-6 shadow-sm">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">Most Popular</span>
              </div>
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-500" />
                <p className="text-base font-bold text-slate-900">Pro</p>
              </div>
              <p className="mb-4 text-2xl font-bold text-slate-900">
                {PLAN_PRICES.pro}
                <span className="text-sm font-normal text-slate-400"> / month</span>
              </p>
              <ul className="mb-6 space-y-2">
                {PLAN_FEATURES.pro.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/api/stripe/checkout?plan=pro"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Upgrade to Pro <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Kiosk Kit */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900">
            <Package className="h-6 w-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Hardware Kiosk Kit</p>
            <p className="mt-1 text-sm text-slate-500">
              Tablet, Bluetooth barcode scanner, and floor stand shipped to your door — ready to scan helmet QR codes in minutes. Includes a 1-hour onboarding call.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="/api/stripe/kiosk-kit"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <CreditCard className="h-4 w-4" />
                Order Kiosk Kit — $599
              </a>
              <span className="text-xs text-slate-400">One-time charge, no subscription</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
