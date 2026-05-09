import { cn } from '@/lib/utils'

type Status = 'pass' | 'fail' | 'out_of_service'

const config: Record<Status, { label: string; dot: string; pill: string }> = {
  pass:          { label: 'Pass',          dot: 'bg-green-500', pill: 'bg-green-50 text-green-700 border-green-200' },
  fail:          { label: 'Fail',          dot: 'bg-yellow-500',pill: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  out_of_service:{ label: 'Out of Service',dot: 'bg-red-500',   pill: 'bg-red-50 text-red-700 border-red-200' },
}

export function EquipmentInspectionStatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = config[status as Status] ?? config.fail
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      cfg.pill,
      className
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
