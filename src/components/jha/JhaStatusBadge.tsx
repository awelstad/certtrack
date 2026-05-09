import { cn } from '@/lib/utils'

type Status = 'draft' | 'active' | 'completed' | 'archived'

const config: Record<Status, { label: string; dot: string; pill: string }> = {
  draft:     { label: 'Draft',     dot: 'bg-slate-400',  pill: 'bg-slate-100 text-slate-600 border-slate-200' },
  active:    { label: 'Active',    dot: 'bg-blue-500',   pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', dot: 'bg-green-500',  pill: 'bg-green-50 text-green-700 border-green-200' },
  archived:  { label: 'Archived',  dot: 'bg-amber-400',  pill: 'bg-amber-50 text-amber-700 border-amber-200' },
}

export function JhaStatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = config[status as Status] ?? config.draft
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
