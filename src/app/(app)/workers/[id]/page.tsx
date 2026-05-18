import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/workers/StatusBadge'
import { QRCodeDisplay } from '@/components/workers/QRCodeDisplay'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import { ArrowLeft, Award, QrCode, Phone, Mail, Smartphone, Monitor, ScanLine, Pencil } from 'lucide-react'
import type { WorkerStatus, CertStatus } from '@/lib/types'

const employmentVariant: Record<WorkerStatus, 'green' | 'slate' | 'red'> = {
  active: 'green',
  inactive: 'slate',
  suspended: 'red',
}

function parseDevice(ua: string | null): { label: string; icon: React.ElementType } {
  if (!ua) return { label: 'Unknown device', icon: Monitor }
  const u = ua.toLowerCase()
  if (u.includes('iphone') || u.includes('ipad'))  return { label: 'iPhone / iPad', icon: Smartphone }
  if (u.includes('android'))                        return { label: 'Android',        icon: Smartphone }
  if (u.includes('mobile'))                         return { label: 'Mobile',          icon: Smartphone }
  return { label: 'Desktop', icon: Monitor }
}

function formatScanTime(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs  = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1)   return 'Just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  if (diffHrs  < 24)  return `${diffHrs}h ago`
  if (diffDays < 7)   return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: worker } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .single()

  if (!worker) notFound()

  const [{ data: certs }, { data: scanLogs }] = await Promise.all([
    supabase
      .from('worker_certifications')
      .select('status, expiry_date')
      .eq('worker_id', id),
    supabase
      .from('qr_scan_logs')
      .select('id, created_at, ip_address, user_agent')
      .eq('worker_id', id)
      .eq('scan_type', 'worker')
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  const certStatus = calculateWorkerOverallStatus(
    (certs ?? []).map((c) => ({ status: c.status as CertStatus, expiry_date: c.expiry_date }))
  )

  const totalScans = scanLogs?.length ?? 0

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/workers" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Workers
        </Link>
      </div>

      {/* Profile header */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          {worker.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={worker.avatar_url}
              alt="Worker"
              className="h-16 w-16 shrink-0 rounded-full object-cover border-2 border-slate-200"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-600">
              {worker.first_name[0]}{worker.last_name[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {worker.first_name} {worker.last_name}
              </h1>
              <Badge label={worker.status} variant={employmentVariant[worker.status as WorkerStatus]} />
              <StatusBadge status={certStatus} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {worker.trade && <span>{worker.trade}</span>}
              {worker.employer && <span>{worker.employer}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {worker.phone && (
                <a href={`tel:${worker.phone}`} className="flex items-center gap-1 text-slate-500 hover:text-slate-900">
                  <Phone className="h-3.5 w-3.5" />
                  {worker.phone}
                </a>
              )}
              {worker.email && (
                <a href={`mailto:${worker.email}`} className="flex items-center gap-1 text-slate-500 hover:text-slate-900">
                  <Mail className="h-3.5 w-3.5" />
                  {worker.email}
                </a>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/workers/${id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <Link
              href={`/badge/${worker.public_id}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <QrCode className="h-4 w-4" />
              Print Badge
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sub-page cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href={`/workers/${id}/certifications`}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Certifications</p>
                <p className="text-sm text-slate-500">{certs?.length ?? 0} on file</p>
              </div>
            </Link>
          </div>

          {/* QR Scan History */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700">QR Scan History</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {totalScans} scan{totalScans !== 1 ? 's' : ''}
              </span>
            </div>

            {!scanLogs?.length ? (
              <p className="px-5 py-6 text-sm text-slate-400">No scans recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {scanLogs.map((scan) => {
                  const { label, icon: DeviceIcon } = parseDevice(scan.user_agent)
                  return (
                    <li key={scan.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                        <DeviceIcon className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">{label}</p>
                        {scan.ip_address && (
                          <p className="text-xs text-slate-400">{scan.ip_address}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatScanTime(scan.created_at)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* QR code sidebar */}
        <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium text-slate-700">Worker QR Code</p>
          <QRCodeDisplay publicId={worker.public_id} size={160} />
          <Link
            href={`/qr/${worker.public_id}`}
            target="_blank"
            className="mt-4 text-xs text-slate-400 hover:text-slate-600 hover:underline"
          >
            View public profile →
          </Link>
          {totalScans > 0 && (
            <div className="mt-4 w-full rounded-lg bg-slate-50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-slate-900">{totalScans}</p>
              <p className="text-xs text-slate-500">total scan{totalScans !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
