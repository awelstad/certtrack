'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CertificationUploadForm } from '@/components/certifications/CertificationUploadForm'

interface Props {
  workerId: string
  orgId: string
  certTypes: Array<{ id: string; name: string }>
}

export function UploadCertButton({ workerId, orgId, certTypes }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
      >
        <Plus className="h-4 w-4" />
        Upload Cert
      </button>

      {open && (
        <CertificationUploadForm
          workerId={workerId}
          orgId={orgId}
          certTypes={certTypes}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
