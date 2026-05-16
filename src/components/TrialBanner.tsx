import Link from 'next/link'

type Props = {
  trialEndsAt: string
  trialStatus: string
}

export function TrialBanner({ trialEndsAt, trialStatus }: Props) {
  if (trialStatus !== 'trialing') return null

  const msLeft = new Date(trialEndsAt).getTime() - Date.now()
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
  const expired = daysLeft <= 0

  if (expired) {
    return (
      <div className="bg-red-600 text-white px-4 py-2.5 text-sm flex items-center justify-between gap-4">
        <span className="font-medium">Your free trial has ended.</span>
        <Link
          href="https://clearworkers.com/#pricing"
          target="_blank"
          className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
        >
          Upgrade now →
        </Link>
      </div>
    )
  }

  const urgent = daysLeft <= 3

  return (
    <div className={`px-4 py-2.5 text-sm flex items-center justify-between gap-4 ${urgent ? 'bg-red-500' : 'bg-orange-500'} text-white`}>
      <span>
        <span className="font-semibold">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your free trial.</span>
        {' '}Upgrade before it ends to keep your data and access.
      </span>
      <Link
        href="https://clearworkers.com/#pricing"
        target="_blank"
        className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-50 transition-colors flex-shrink-0"
      >
        View plans →
      </Link>
    </div>
  )
}
