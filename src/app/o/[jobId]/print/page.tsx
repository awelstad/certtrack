import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function OrientationPrintPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const admin = createAdminClient()

  const { data: orientation } = await admin
    .from('job_orientations')
    .select('id, organization_id, title')
    .eq('job_id', jobId)
    .single()
  if (!orientation) notFound()

  const [{ data: job }, { data: org }] = await Promise.all([
    admin.from('jobs').select('name, city, state, address').eq('id', jobId).single(),
    admin
      .from('organizations')
      .select('name, logo_url, brand_color')
      .eq('id', orientation.organization_id)
      .single(),
  ])

  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const proto = hdrs.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  const publicUrl = `${proto}://${host}/o/${jobId}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(publicUrl)}`

  const jobName = job?.name ?? 'Job Site'
  const orgName = org?.name ?? ''
  const brandColor = org?.brand_color ?? '#f97316'
  const logoUrl = org?.logo_url ?? null
  const location = [job?.address, job?.city, job?.state].filter(Boolean).join(', ') || null

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        @page { size: letter; margin: 0.5in; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      {/* Print button */}
      <div className="no-print fixed top-4 right-4 flex gap-3 z-10">
        <button
          onClick={() => window.print()}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg"
          style={{ backgroundColor: brandColor }}
        >
          🖨 Print / Save as PDF
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow"
        >
          Close
        </button>
      </div>

      {/* Printable content */}
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg">
          {/* Header with brand color */}
          <div
            className="rounded-t-2xl px-8 py-6 text-center"
            style={{ backgroundColor: brandColor }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={orgName}
                className="mx-auto h-14 object-contain brightness-0 invert mb-3"
              />
            ) : (
              <p className="text-white text-xl font-bold mb-3">{orgName}</p>
            )}
            {logoUrl && <p className="text-white/90 font-semibold text-lg">{orgName}</p>}
          </div>

          {/* Body */}
          <div className="border border-slate-200 border-t-0 rounded-b-2xl px-8 py-8 text-center space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Site Safety Orientation Required</p>
              <h1 className="text-2xl font-black text-slate-900">{jobName}</h1>
              {location && <p className="text-slate-500 text-sm mt-1">{location}</p>}
            </div>

            {/* QR Code */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="Orientation QR code"
              className="mx-auto"
              style={{ width: 220, height: 220 }}
            />

            {/* Instructions */}
            <div className="rounded-xl border-2 border-dashed border-slate-300 px-6 py-5 text-left space-y-3">
              <p className="font-bold text-slate-800 text-sm">Instructions:</p>
              <ol className="text-sm text-slate-600 space-y-2 list-none">
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: brandColor }}>1.</span>
                  Open your phone camera and point it at the QR code above.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: brandColor }}>2.</span>
                  Tap the link that appears to open the orientation on your phone.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: brandColor }}>3.</span>
                  Enter your name and email to receive your secure access link.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: brandColor }}>4.</span>
                  Watch the safety video and complete the quiz. You must pass to receive your site sticker.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: brandColor }}>5.</span>
                  Show your pass email or pass ID to the site safety manager.
                </li>
              </ol>
            </div>

            {/* Manual URL */}
            <div className="rounded-lg bg-slate-50 px-4 py-2.5">
              <p className="text-xs text-slate-400 mb-0.5">Or type this address into your browser:</p>
              <p className="text-xs font-mono font-semibold text-slate-600 break-all">{publicUrl}</p>
            </div>

            <p className="text-xs text-slate-400">
              All workers must complete orientation before starting work on this site.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
