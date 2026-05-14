import { daysUntilExpiry } from '@/lib/types'
import type { CertStatus } from '@/lib/types'

export type CertComplianceStatus = 'green' | 'yellow' | 'red' | 'gray'

export type CertWithStatus = {
  status: CertStatus
  expiry_date: string | null
}

// Returns overall compliance color for a worker given their certs.
// gray  = no certs on file
// green = all approved, none expiring within 30d
// yellow = at least one approved cert expires within 30d
// red   = any rejected, expired, or hard-expired cert
export function calculateWorkerOverallStatus(certs: CertWithStatus[]): CertComplianceStatus {
  if (certs.length === 0) return 'gray'

  let hasYellow = false

  for (const cert of certs) {
    if (cert.status === 'rejected') return 'red'
    if (cert.status === 'expired') return 'red'

    if (cert.status === 'approved' && cert.expiry_date) {
      const days = daysUntilExpiry(cert.expiry_date)
      if (days < 0) return 'red'
      if (days <= 30) hasYellow = true
    }
  }

  return hasYellow ? 'yellow' : 'green'
}

// Per-cert status indicator.
export function getCertExpirationStatus(
  status: CertStatus,
  expiry_date: string | null
): { label: string; color: CertComplianceStatus } {
  if (status === 'rejected') return { label: 'Rejected', color: 'red' }
  if (status === 'pending') return { label: 'Pending', color: 'yellow' }
  if (status === 'expired') return { label: 'Expired', color: 'red' }

  if (!expiry_date) return { label: 'No expiry', color: 'green' }

  const days = daysUntilExpiry(expiry_date)
  if (days < 0) return { label: 'Expired', color: 'red' }
  if (days <= 7) return { label: `Expires in ${days}d`, color: 'red' }
  if (days <= 30) return { label: `Expires in ${days}d`, color: 'yellow' }
  if (days <= 60) return { label: `Expires in ${days}d`, color: 'yellow' }
  return { label: `Expires in ${days}d`, color: 'green' }
}

// Builds the public QR verification URL for a worker.
export function generateWorkerQrUrl(publicId: string, host: string): string {
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${host}/qr/${publicId}`
}

// Returns certs expiring within `days` from today (approved only, sorted ascending).
// Pass a supabase server client; keeps this compatible with server components and actions.
export async function getExpiringCerts(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  orgId: string,
  withinDays: number
) {
  const today = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + withinDays * 864e5).toISOString().split('T')[0]

  const { data } = await supabase
    .from('worker_certifications')
    .select('id, expiry_date, status, worker_id, certification_type_id, workers(id, first_name, last_name), certification_types(name)')
    .eq('organization_id', orgId)
    .eq('status', 'approved')
    .gte('expiry_date', today)
    .lte('expiry_date', future)
    .order('expiry_date', { ascending: true })

  return data ?? []
}

// ─── Job-specific compliance helpers ─────────────────────────────────────────

export type WorkerCertForJob = {
  certification_type_id: string
  status: CertStatus
  expiry_date: string | null
}

export type MissingRequirement = {
  typeId: string
  name: string
  reason: 'missing' | 'pending' | 'rejected' | 'expired' | 'expiring_soon'
  daysLeft?: number
}

// Compliance status for a specific worker against a specific job's requirements.
// Unlike calculateWorkerOverallStatus, this is scoped to required cert types only.
// Green = all required certs approved and not near expiry
// Yellow = all required certs approved but at least one expires within 30d
// Red    = missing, expired, or rejected cert for at least one required type
export function calculateWorkerJobStatus(
  requiredTypeIds: string[],
  workerCerts: WorkerCertForJob[]
): CertComplianceStatus {
  if (requiredTypeIds.length === 0) return 'green'

  let hasYellow = false

  for (const typeId of requiredTypeIds) {
    const certsForType = workerCerts.filter((c) => c.certification_type_id === typeId)
    const approved = certsForType.find((c) => c.status === 'approved')

    if (!approved) return 'red'

    if (approved.expiry_date) {
      const days = daysUntilExpiry(approved.expiry_date)
      if (days < 0) return 'red'
      if (days <= 30) hasYellow = true
    }
  }

  return hasYellow ? 'yellow' : 'green'
}

// Returns the list of required certs a worker is not fully compliant on.
// Includes expired, rejected, missing, pending, and expiring-soon certs.
export function getMissingJobRequirements(
  requiredTypeIds: string[],
  workerCerts: WorkerCertForJob[],
  certTypeNames: Map<string, string>
): MissingRequirement[] {
  const issues: MissingRequirement[] = []

  for (const typeId of requiredTypeIds) {
    const certsForType = workerCerts.filter((c) => c.certification_type_id === typeId)
    const approved = certsForType.find((c) => c.status === 'approved')
    const name = certTypeNames.get(typeId) ?? 'Unknown'

    if (!approved) {
      const hasPending  = certsForType.some((c) => c.status === 'pending')
      const hasRejected = certsForType.some((c) => c.status === 'rejected')
      issues.push({
        typeId,
        name,
        reason: hasPending ? 'pending' : hasRejected ? 'rejected' : 'missing',
      })
      continue
    }

    if (approved.expiry_date) {
      const days = daysUntilExpiry(approved.expiry_date)
      if (days < 0) {
        issues.push({ typeId, name, reason: 'expired' })
      } else if (days <= 30) {
        issues.push({ typeId, name, reason: 'expiring_soon', daysLeft: days })
      }
    }
  }

  return issues
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

// Generates a Supabase Storage signed URL for a private cert document.
// Signed URLs expire after 1 hour.
export async function generateSignedDocumentUrl(
  _supabase: unknown,
  path: string
): Promise<string | null> {
  if (!path) return null
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data } = await admin.storage
    .from('cert-documents')
    .createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
