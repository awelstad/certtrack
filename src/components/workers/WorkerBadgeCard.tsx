import Link from 'next/link'
import { StatusBadge } from '@/components/workers/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import type { CertComplianceStatus } from '@/lib/certifications'
import type { WorkerStatus } from '@/lib/types'

const employmentVariant: Record<WorkerStatus, 'green' | 'slate' | 'red'> = {
  active: 'green',
  inactive: 'slate',
  suspended: 'red',
}

interface Props {
  worker: {
    id: string
    first_name: string
    last_name: string
    trade: string | null
    employer: string | null
    status: WorkerStatus
    avatar_url: string | null
  }
  certStatus?: CertComplianceStatus
  href?: string
}

export function WorkerBadgeCard({ worker: w, certStatus, href }: Props) {
  const initials = `${w.first_name[0]}${w.last_name[0]}`
  const content = (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {w.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={w.avatar_url}
          alt={initials}
          className="h-12 w-12 shrink-0 rounded-full object-cover border border-slate-200"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-bold text-slate-600">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{w.first_name} {w.last_name}</p>
        {w.trade && <p className="text-sm text-slate-500">{w.trade}</p>}
        {w.employer && <p className="text-xs text-slate-400">{w.employer}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {certStatus && <StatusBadge status={certStatus} />}
        {w.status !== 'active' && (
          <Badge label={w.status} variant={employmentVariant[w.status]} />
        )}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-80">
        {content}
      </Link>
    )
  }
  return content
}
