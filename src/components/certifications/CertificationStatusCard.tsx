import Link from 'next/link'
import { FileText, ExternalLink } from 'lucide-react'
import { getCertExpirationStatus } from '@/lib/certifications'
import { Badge } from '@/components/ui/Badge'
import type { CertStatus } from '@/lib/types'

interface Props {
  cert: {
    id: string
    status: CertStatus
    expiry_date: string | null
    issue_date: string | null
    notes: string | null
    certification_types: { name: string } | null
  }
  workerId: string
  signedDocumentUrl?: string | null
}

const statusVariant: Record<CertStatus, 'green' | 'yellow' | 'red' | 'slate'> = {
  approved: 'green',
  pending: 'yellow',
  rejected: 'red',
  expired: 'red',
}

export function CertificationStatusCard({ cert, workerId, signedDocumentUrl }: Props) {
  const expiry = getCertExpirationStatus(cert.status, cert.expiry_date)

  const borderColor = {
    green: 'border-l-green-500',
    yellow: 'border-l-yellow-400',
    red: 'border-l-red-500',
    gray: 'border-l-slate-300',
  }[expiry.color]

  return (
    <div className={`flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${borderColor}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <FileText className="h-4 w-4 text-slate-500" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-900">
            {cert.certification_types?.name ?? 'Unknown Certification'}
          </p>
          <Badge label={cert.status} variant={statusVariant[cert.status]} />
        </div>

        <p className="mt-0.5 text-sm text-slate-500">
          {cert.issue_date ? `Issued ${cert.issue_date}` : 'No issue date'}
          {cert.expiry_date && ` · ${expiry.label}`}
        </p>

        {cert.notes && (
          <p className="mt-1 text-xs text-slate-400 italic">{cert.notes}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {signedDocumentUrl && (
          <a
            href={signedDocumentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </a>
        )}
        <Link
          href={`/workers/${workerId}/certifications/${cert.id}`}
          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Details
        </Link>
      </div>
    </div>
  )
}
