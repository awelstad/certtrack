import { cn } from '@/lib/utils'
import type { CertComplianceStatus } from '@/lib/certifications'

const config: Record<
  CertComplianceStatus,
  { label: string; dot: string; pill: string }
> = {
  green:  { label: 'Cleared',       dot: 'bg-green-500',  pill: 'bg-green-50 text-green-700 border-green-200' },
  yellow: { label: 'Expiring Soon', dot: 'bg-yellow-400', pill: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  red:    { label: 'Not Cleared',   dot: 'bg-red-500',    pill: 'bg-red-50 text-red-700 border-red-200' },
  gray:   { label: 'No Certs',      dot: 'bg-slate-400',  pill: 'bg-slate-50 text-slate-600 border-slate-200' },
}

interface Props {
  status: CertComplianceStatus
  className?: string
}

export function StatusBadge({ status, className }: Props) {
  const { label, dot, pill } = config[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        pill,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {label}
    </span>
  )
}
