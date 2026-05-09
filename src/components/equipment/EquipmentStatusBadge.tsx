import { cn } from '@/lib/utils'

type Status = 'active' | 'inactive' | 'out_of_service' | 'retired'

const config: Record<Status, { label: string; dot: string; pill: string }> = {
  active:        { label: 'Active',        dot: 'bg-green-500', pill: 'bg-green-50 text-green-700 border-green-200' },
  inactive:      { label: 'Inactive',      dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 border-slate-200' },
  out_of_service:{ label: 'Out of Service',dot: 'bg-red-500',   pill: 'bg-red-50 text-red-700 border-red-200' },
  retired:       { label: 'Retired',       dot: 'bg-slate-300', pill: 'bg-slate-50 text-slate-500 border-slate-200' },
}

export function EquipmentStatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = config[status as Status] ?? config.inactive
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
