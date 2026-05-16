import Link from 'next/link'
import { PLAN_LIMITS } from '@/lib/plans'

type Usage = {
  workers: number
  equipment: number
  jhas: number
  toolboxTalks: number
}

type Props = {
  plan: string
  usage: Usage
}

export function PlanBanner({ plan, usage }: Props) {
  if (plan !== 'free') return null

  const limits = PLAN_LIMITS.free

  const atLimit =
    usage.workers >= limits.workers ||
    usage.equipment >= limits.equipment ||
    usage.jhas >= limits.jhas ||
    usage.toolboxTalks >= limits.toolboxTalks

  return (
    <div className={`px-4 py-2.5 text-sm flex items-center justify-between gap-4 ${atLimit ? 'bg-red-500' : 'bg-orange-500'} text-white`}>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">Free Plan</span>
        <span className="opacity-75">&#183;</span>
        <span>{usage.workers}/{limits.workers} workers</span>
        <span className="opacity-75">&#183;</span>
        <span>{usage.equipment}/{limits.equipment} equipment</span>
        <span className="opacity-75">&#183;</span>
        <span>{usage.jhas}/{limits.jhas} JHAs</span>
        <span className="opacity-75">&#183;</span>
        <span>{usage.toolboxTalks}/{limits.toolboxTalks} toolbox talks</span>
      </span>
      <Link
        href="https://clearworkers.com/#pricing"
        target="_blank"
        className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-50 transition-colors flex-shrink-0"
      >
        Upgrade &#8594;
      </Link>
    </div>
  )
}
