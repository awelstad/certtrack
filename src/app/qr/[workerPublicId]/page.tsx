import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { certExpiryLabel } from '@/lib/types'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import { BrandingHeader } from '@/components/ui/BrandingHeader'
import { ShieldCheck, ShieldAlert, ShieldX, Clock } from 'lucide-react'
import type { CertStatus } from '@/lib/types'

export default async function QrWorkerPage({
  params,
}: {
  params: Promise<{ workerPublicId: string }>
}) {
  const { workerPublicId } = await params
  const supabase = await createClient()

  const { data: worker } = await supabase
    .from('workers')
    .select('id, first_name, last_name, trade, employer, status, avatar_url, organization_id, public_id')
    .eq('public_id', workerPublicId)
    .single()

  if (!worker) notFound()

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, brand_color')
    .eq('id', worker.organization_id)
    .single()

  const { data: allCerts } = await supabase
    .from('worker_certifications')
    .select('id, expiry_date, status, certification_types(name)')
    .eq('worker_id', worker.id)
    .order('expiry_date', { ascending: true })

  const compliance = calculateWorkerOverallStatus(
    (allCerts ?? []).map((c) => ({ status: c.status as CertStatus, expiry_date: c.expiry_date }))
  )

  const approvedCerts = (allCerts ?? []).filter((c) => c.status === 'approved')

  // Log the QR scan (best-effort)
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? headersList.get('x-real-ip') ?? null
  const ua = headersList.get('user-agent') ?? null

  await supabase.from('qr_scan_logs').insert({
    organization_id: worker.organization_id,
    worker_id: worker.id,
    public_id: workerPublicId,
    scan_type: 'worker',
    ip_address: ip,
    user_agent: ua,
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('audit_logs').insert({
      organization_id: worker.organization_id,
      actor_id: user.id,
      action: 'qr_viewed',
      entity_type: 'qr_scan',
      entity_id: worker.id,
      metadata: { public_id: workerPublicId },
    })
  }

  const brandColor = org?.brand_color ?? '#0f172a'

  const complianceConfig = {
    green: {
      Icon: ShieldCheck,
      label: 'Cleared',
      sub: 'All certifications are current.',
      pillClass: 'bg-green-50 text-green-700 border-green-200',
      iconClass: 'text-green-600',
    },
    yellow: {
      Icon: ShieldAlert,
      label: 'Expiring Soon',
      sub: 'One or more certifications expire within 30 days.',
      pillClass: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      iconClass: 'text-yellow-600',
    },
    red: {
      Icon: ShieldX,
      label: 'Not Cleared',
      sub: 'Missing, expired, or rejected certifications on file.',
      pillClass: 'bg-red-50 text-red-700 border-red-200',
      iconClass: 'text-red-600',
    },
    gray: {
      Icon: Clock,
      label: 'No Certifications',
      sub: 'No certifications on file.',
      pillClass: 'bg-slate-50 text-slate-600 border-slate-200',
      iconClass: 'text-slate-400',
    },
  }

  const config = complianceConfig[compliance]
  const { Icon } = config

  return (
    <div className="min-h-screen bg-slate-50">
      <BrandingHeader
        orgName={org?.name ?? 'Clearwork'}
        logoUrl={org?.logo_url}
        brandColor={brandColor}
      />

      <div className="mx-auto max-w-md space-y-5 px-4 py-6">
        {/* Worker identity card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          {worker.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={worker.avatar_url}
              alt="Worker"
              className="mx-auto h-20 w-20 rounded-full object-cover border-2 border-slate-200"
            />
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-2xl font-bold text-slate-600">
              {worker.first_name[0]}{worker.last_name[0]}
            </div>
          )}
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            {worker.first_name} {worker.last_name}
          </h1>
          {worker.trade && <p className="mt-1 text-sm text-slate-500">{worker.trade}</p>}
          {worker.employer && <p className="text-sm text-slate-500">{worker.employer}</p>}

          {/* Compliance status pill */}
          <div className={`mt-5 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold ${config.pillClass}`}>
            <Icon className={`h-5 w-5 ${config.iconClass}`} />
            {config.label}
          </div>
          <p className="mt-2 text-xs text-slate-400">{config.sub}</p>
        </div>

        {/* Approved certifications */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Certifications on File</h2>
          </div>
          {!approvedCerts.length ? (
            <p className="px-5 py-4 text-sm text-slate-500">No approved certifications on file.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {approvedCerts.map((c) => {
                const ct = c.certification_types as unknown as { name: string } | null
                const expiry = certExpiryLabel(c.expiry_date)
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <p className="text-sm font-medium text-slate-900">{ct?.name ?? '—'}</p>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        expiry.color === 'green'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : expiry.color === 'yellow'
                          ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {expiry.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Verified by Clearwork &middot; Live status as of {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
