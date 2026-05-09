export type Role =
  | 'owner'
  | 'admin'
  | 'pm'
  | 'superintendent'
  | 'worker'
  | 'subcontractor_admin'
  | 'gc_read_only'

export type CertStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type JobStatus = 'active' | 'completed' | 'on_hold' | 'cancelled'
export type WorkerStatus = 'active' | 'inactive' | 'suspended'
export type InspectionStatus = 'pass' | 'fail' | 'needs_repair'
export type JhaStatus = 'draft' | 'active' | 'completed' | 'archived'
export type ReminderStatus = 'pending' | 'sent' | 'dismissed'

export type Profile = {
  id: string
  organization_id: string
  role: Role
  full_name: string
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Organization = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export type Worker = {
  id: string
  organization_id: string
  profile_id: string | null
  public_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  trade: string | null
  employer: string | null
  status: WorkerStatus
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Job = {
  id: string
  organization_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  status: JobStatus
  superintendent_id: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export type CertificationType = {
  id: string
  organization_id: string
  name: string
  description: string | null
  validity_days: number | null
  requires_document: boolean
  created_at: string
  updated_at: string
}

export type WorkerCertification = {
  id: string
  organization_id: string
  worker_id: string
  certification_type_id: string
  issue_date: string | null
  expiry_date: string | null
  status: CertStatus
  document_url: string | null
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type Equipment = {
  id: string
  organization_id: string
  public_id: string
  equipment_type_id: string | null
  name: string
  make: string | null
  model: string | null
  serial_number: string | null
  year: number | null
  job_id: string | null
  status: 'active' | 'inactive' | 'out_of_service' | 'retired'
  created_at: string
  updated_at: string
}

export type Jha = {
  id: string
  organization_id: string
  job_id: string
  template_id: string | null
  title: string
  work_description: string | null
  work_area: string | null
  work_date: string | null
  status: JhaStatus
  superintendent_id: string | null
  field_values: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// Convenience: worker display name
export function workerName(w: Pick<Worker, 'first_name' | 'last_name'>) {
  return `${w.first_name} ${w.last_name}`
}

// Days until expiry (negative = already expired)
export function daysUntilExpiry(expiry_date: string): number {
  const now = new Date()
  const exp = new Date(expiry_date)
  return Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function certExpiryLabel(expiry_date: string | null): {
  label: string
  color: 'green' | 'yellow' | 'red'
} {
  if (!expiry_date) return { label: 'No expiry', color: 'green' }
  const days = daysUntilExpiry(expiry_date)
  if (days < 0) return { label: 'Expired', color: 'red' }
  if (days <= 30) return { label: `Expires in ${days}d`, color: 'yellow' }
  return { label: `Expires in ${days}d`, color: 'green' }
}
