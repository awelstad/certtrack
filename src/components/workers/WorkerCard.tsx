import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
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
}

export function WorkerCard({ worker: w, certStatus }: Props) {
  const initials = `${w.first_name[0]}${w.last_name[0]}`

  return (
    <li>
      <Link
        href={`/workers/${w.id}`}
        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
      >
        {w.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={w.avatar_url}
            alt={initials}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">
            {w.first_name} {w.last_name}
          </p>
          <p className="truncate text-sm text-slate-500">
            {[w.trade, w.employer].filter(Boolean).join(' · ') || 'No trade assigned'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {certStatus && <StatusBadge status={certStatus} />}
          {w.status !== 'active' && (
            <Badge label={w.status} variant={employmentVariant[w.status]} />
          )}
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>
      </Link>
    </li>
  )
}
