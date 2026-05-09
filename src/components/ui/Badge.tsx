import { cn } from '@/lib/utils'

type Variant = 'green' | 'red' | 'yellow' | 'blue' | 'slate'

const styles: Record<Variant, string> = {
  green:  'bg-green-100 text-green-800 border-green-200',
  red:    'bg-red-100 text-red-800 border-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  blue:   'bg-blue-100 text-blue-800 border-blue-200',
  slate:  'bg-slate-100 text-slate-700 border-slate-200',
}

type Props = {
  label: string
  variant?: Variant
  className?: string
}

export function Badge({ label, variant = 'slate', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        styles[variant],
        className
      )}
    >
      {label}
    </span>
  )
}
