import Link from 'next/link'
import { StatusBadge } from '@/components/workers/StatusBadge'
import { calculateWorkerJobStatus, getMissingJobRequirements } from '@/lib/certifications'
import type { WorkerCertForJob, MissingRequirement, CertComplianceStatus } from '@/lib/certifications'
import type { WorkerStatus } from '@/lib/types'
import { RemoveWorkerButton } from '@/components/jobs/RemoveWorkerButton'

const reasonLabel: Record<MissingRequirement['reason'], string> = {
  missing:       'Not uploaded',
  pending:       'Pending review',
  rejected:      'Rejected',
  expired:       'Expired',
  expiring_soon: 'Expiring soon',
}

const reasonColor: Record<MissingRequirement['reason'], string> = {
  missing:       'text-red-600',
  pending:       'text-yellow-600',
  rejected:      'text-red-600',
  expired:       'text-red-600',
  expiring_soon: 'text-yellow-600',
}

interface Worker {
  id: string
  first_name: string
  last_name: string
  trade: string | null
  employer: string | null
  status: WorkerStatus
  avatar_url: string | null
}

interface Props {
  jobId: string
  workers: Worker[]
  certsByWorker: Map<string, WorkerCertForJob[]>
  requiredTypeIds: string[]
  certTypeNames: Map<string, string>
  isManager: boolean
  requiredOrientationIds?: string[]
  signedOrientationsByWorker?: Map<string, Set<string>>
  orientationTitles?: Map<string, string>
}

function combineStatus(
  certStatus: CertComplianceStatus,
  unsignedCount: number
): CertComplianceStatus {
  if (unsignedCount > 0) return 'red'
  return certStatus
}

export function JobComplianceTable({
  jobId,
  workers,
  certsByWorker,
  requiredTypeIds,
  certTypeNames,
  isManager,
  requiredOrientationIds = [],
  signedOrientationsByWorker = new Map(),
  orientationTitles = new Map(),
}: Props) {
  if (!workers.length) return null

  function getUnsigned(workerId: string): string[] {
    return requiredOrientationIds.filter(
      (oid) => !signedOrientationsByWorker.get(workerId)?.has(oid)
    )
  }

  // Sort: red → yellow → green
  const order = { red: 0, yellow: 1, green: 2, gray: 3 }
  const sorted = [...workers].sort((a, b) => {
    const certA = calculateWorkerJobStatus(requiredTypeIds, certsByWorker.get(a.id) ?? [])
    const certB = calculateWorkerJobStatus(requiredTypeIds, certsByWorker.get(b.id) ?? [])
    const sa = combineStatus(certA, getUnsigned(a.id).length)
    const sb = combineStatus(certB, getUnsigned(b.id).length)
    return order[sa] - order[sb]
  })

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-100">
        {sorted.map((w) => {
          const certs = certsByWorker.get(w.id) ?? []
          const certStatus = calculateWorkerJobStatus(requiredTypeIds, certs)
          const certIssues = getMissingJobRequirements(requiredTypeIds, certs, certTypeNames)
          const unsignedOrientations = getUnsigned(w.id)
          const status = combineStatus(certStatus, unsignedOrientations.length)
          const initials = `${w.first_name[0]}${w.last_name[0]}`

          return (
            <li key={w.id} className="px-5 py-4">
              <div className="flex items-center gap-4">
                {w.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={w.avatar_url}
                    alt={initials}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                    {initials}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/workers/${w.id}/certifications`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {w.first_name} {w.last_name}
                  </Link>
                  {w.trade && (
                    <p className="text-sm text-slate-500">
                      {w.trade}
                      {w.employer ? ` · ${w.employer}` : ''}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={status} />
                  {isManager && (
                    <RemoveWorkerButton jobId={jobId} workerId={w.id} />
                  )}
                </div>
              </div>

              {/* Cert issues */}
              {(certIssues.length > 0 || unsignedOrientations.length > 0) && (
                <ul className="mt-2.5 ml-14 space-y-1">
                  {certIssues.map((issue) => (
                    <li key={issue.typeId} className="flex items-center gap-2 text-xs">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
                      <span className="font-medium text-slate-700">{issue.name}</span>
                      <span className={reasonColor[issue.reason]}>
                        — {reasonLabel[issue.reason]}
                        {issue.reason === 'expiring_soon' && issue.daysLeft !== undefined
                          ? ` (${issue.daysLeft}d)`
                          : ''}
                      </span>
                    </li>
                  ))}
                  {unsignedOrientations.map((oid) => (
                    <li key={oid} className="flex items-center gap-2 text-xs">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
                      <span className="font-medium text-slate-700">
                        {orientationTitles.get(oid) ?? 'Orientation'}
                      </span>
                      <span className="text-red-600">— Not signed</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
