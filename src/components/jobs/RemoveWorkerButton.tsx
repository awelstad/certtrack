'use client'

import { useTransition } from 'react'
import { X } from 'lucide-react'
import { removeWorkerFromJob } from '@/app/actions/jobs'

interface Props {
  jobId: string
  workerId: string
}

export function RemoveWorkerButton({ jobId, workerId }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await removeWorkerFromJob(jobId, workerId)
        })
      }
      disabled={isPending}
      title="Remove from job"
      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
    >
      <X className="h-4 w-4" />
    </button>
  )
}
