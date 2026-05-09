import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/workers/StatusBadge'
import { QRCodeDisplay } from '@/components/workers/QRCodeDisplay'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import { ArrowLeft, Award, QrCode, Phone, Mail } from 'lucide-react'
import type { WorkerStatus, CertStatus } from '@/lib/types'

const employmentVariant: Record<WorkerStatus, 'green' | 'slate' | 'red'> = {
  active: 'green',
  inactive: 'slate',
  suspended: 'red',
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

  const { data: certs } = await supabase
    .from('worker_certifications')
    .select('status, expiry_date')
    .eq('worker_id', id)

  const certStatus = calculateWorkerOverallStatus(
    (certs ?? []).map((c) => ({ status: c.status as CertStatus, expiry_date: c.expiry_date }))
  )

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
          {/* Avatar */}
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

          {/* Badge link */}
          <Link
            href={`/badge/${worker.public_id}`}
            target="_blank"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <QrCode className="h-4 w-4" />
            Print Badge
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sub-pages */}
        <div className="lg:col-span-2">
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
                <p className="text-sm text-slate-500">
                  {certs?.length ?? 0} on file
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* QR code */}
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
        </div>
      </div>
    </div>
  )
}
