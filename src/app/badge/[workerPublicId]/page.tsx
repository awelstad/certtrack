import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { certExpiryLabel } from '@/lib/types'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import { BrandingHeader } from '@/components/ui/BrandingHeader'
import { PrintButton } from './PrintButton'
import type { CertStatus } from '@/lib/types'

export default async function BadgeWorkerPage({ params }: { params: Promise<{ workerPublicId: string }> }) {
  const { workerPublicId } = await params
  const supabase = await createClient()

  const { data: worker } = await supabase
    .from('workers')
    .select('id, first_name, last_name, trade, employer, status, avatar_url, organization_id')
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

  const brandColor = org?.brand_color ?? '#0f172a'

  const complianceConfig = {
    green:  { label: 'Cleared',       bg: brandColor, text: '#fff' },
    yellow: { label: 'Expiring Soon', bg: '#d97706',  text: '#fff' },
    red:    { label: 'Not Cleared',   bg: '#dc2626',  text: '#fff' },
    gray:   { label: 'No Certs',      bg: '#94a3b8',  text: '#fff' },
  }
  const badge = complianceConfig[compliance]

  const headersList = await headers()
  const host = headersList.get('host') ?? 'certtrack.app'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const qrUrl = `${protocol}://${host}/qr/${workerPublicId}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUrl)}&margin=4&color=0f172a`

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .badge-print-hide { display: none !important; }
          .badge-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}</style>

      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6">
        <PrintButton />

        <div
          className="badge-card w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          style={{ maxWidth: '324px' }}
        >
          {/* Branded header */}
          <BrandingHeader
            orgName={org?.name ?? 'CertTrack'}
            logoUrl={org?.logo_url}
            brandColor={brandColor}
          />

          {/* Compliance status strip */}
          <div
            className="flex items-center justify-center py-1.5 text-[11px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: badge.bg }}
          >
            {badge.label}
          </div>

          {/* Worker info + QR */}
          <div className="flex items-start gap-4 p-4">
            <div className="flex-1 min-w-0">
              {worker.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={worker.avatar_url}
                  alt="Worker"
                  className="mb-2.5 h-14 w-14 rounded-full object-cover border-2 border-slate-200"
                />
              ) : (
                <div className="mb-2.5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-600">
                  {worker.first_name[0]}{worker.last_name[0]}
                </div>
              )}
              <p className="text-lg font-extrabold leading-tight text-slate-900">
                {worker.first_name}<br />{worker.last_name}
              </p>
              {worker.trade && (
                <p className="mt-1 text-xs font-medium text-slate-500">{worker.trade}</p>
              )}
              {worker.employer && (
                <p className="text-xs text-slate-400">{worker.employer}</p>
              )}
            </div>

            <div className="shrink-0 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="QR Code"
                width={100}
                height={100}
                className="rounded-md"
              />
              <p className="mt-1 text-[9px] text-slate-400">Scan to verify</p>
            </div>
          </div>

          {/* Approved certifications */}
          {approvedCerts.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Certifications</p>
              <div className="space-y-1.5">
                {approvedCerts.map((c) => {
                  const ct = c.certification_types as unknown as { name: string } | null
                  const expiry = certExpiryLabel(c.expiry_date)
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-700">{ct?.name ?? '—'}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        expiry.color === 'green'
                          ? 'bg-green-50 text-green-700'
                          : expiry.color === 'yellow'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {expiry.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 px-4 py-2 text-center">
            <p className="text-[9px] text-slate-300">CertTrack — Construction Compliance</p>
          </div>
        </div>
      </div>
    </>
  )
}
