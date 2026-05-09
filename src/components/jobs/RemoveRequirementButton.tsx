'use client'

import { useTransition } from 'react'
import { X } from 'lucide-react'
import { removeJobRequirement } from '@/app/actions/jobs'

interface Props {
  requirementId: string
  jobId: string
}

export function RemoveRequirementButton({ requirementId, jobId }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await removeJobRequirement(requirementId, jobId)
        })
      }
      disabled={isPending}
      title="Remove requirement"
      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
    >
      <X className="h-4 w-4" />
    </button>
  )
}
