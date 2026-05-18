'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logAttendance } from '@/app/actions/attendance'
import { LogIn, LogOut } from 'lucide-react'

export function ManualCheckInOut({
  workerId,
  publicId,
  jobId,
  currentEvent,
}: {
  workerId: string
  publicId: string
  jobId: string
  currentEvent: 'check_in' | 'check_out' | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // currentEvent is the LAST event. If check_in → next action is check_out and vice versa
  const nextAction = currentEvent === 'check_in' ? 'check_out' : 'check_in'

  function handleClick() {
    setError('')
    startTransition(async () => {
      const result = await logAttendance(publicId, jobId)
      if (result.error) {
        setError(result.error)
      } else {
        setDone(true)
        setTimeout(() => router.back(), 1500)
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-xl bg-green-900/40 border border-green-700 px-4 py-3 text-center">
        <p className="text-green-300 font-semibold text-sm">
          {nextAction === 'check_in' ? 'Checked out' : 'Checked in'} successfully
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      <button
        onClick={handleClick}
        disabled={pending}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
          nextAction === 'check_out'
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {nextAction === 'check_out'
          ? <><LogOut className="h-4 w-4" />{pending ? 'Checking out…' : 'Manual Check-Out'}</>
          : <><LogIn className="h-4 w-4" />{pending ? 'Checking in…' : 'Manual Check-In'}</>
        }
      </button>
      <p className="text-center text-xs text-slate-600">
        Override — use for manual corrections only
      </p>
    </div>
  )
}
