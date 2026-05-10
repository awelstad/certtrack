import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  page: number
  totalPages: number
  basePath: string
  total: number
  pageSize: number
}

export function Pagination({ page, totalPages, basePath, total, pageSize }: Props) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  // Build page number list with ellipsis
  const nums: (number | '…')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      nums.push(i)
    } else if (nums[nums.length - 1] !== '…') {
      nums.push('…')
    }
  }

  function href(p: number) {
    return `${basePath}?page=${p}`
  }

  return (
    <div className="flex flex-col items-center gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:justify-between">
      <p className="text-xs text-slate-500">
        Showing {from}–{to} of {total}
      </p>

      <div className="flex items-center gap-1">
        <Link
          href={page > 1 ? href(page - 1) : '#'}
          aria-disabled={page <= 1}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
            page <= 1
              ? 'pointer-events-none text-slate-300'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-slate-400">
              …
            </span>
          ) : (
            <Link
              key={n}
              href={href(n)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                n === page
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {n}
            </Link>
          )
        )}

        <Link
          href={page < totalPages ? href(page + 1) : '#'}
          aria-disabled={page >= totalPages}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
            page >= totalPages
              ? 'pointer-events-none text-slate-300'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
