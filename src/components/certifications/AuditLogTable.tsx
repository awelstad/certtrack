function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

const actionLabel: Record<string, string> = {
  worker_created: 'Worker created',
  cert_uploaded:  'Cert uploaded',
  cert_approved:  'Cert approved',
  cert_rejected:  'Cert rejected',
  cert_edited:    'Cert edited',
  cert_deleted:   'Cert deleted',
  qr_viewed:      'QR viewed',
}

const actionColor: Record<string, string> = {
  cert_approved: 'text-green-700 bg-green-50',
  cert_rejected: 'text-red-700 bg-red-50',
  cert_deleted:  'text-red-700 bg-red-50',
  cert_uploaded: 'text-blue-700 bg-blue-50',
  qr_viewed:     'text-slate-600 bg-slate-100',
}

interface AuditEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  profiles: { full_name: string } | null
}

interface Props {
  entries: AuditEntry[]
}

export function AuditLogTable({ entries }: Props) {
  if (!entries.length) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">No audit events yet.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            <th className="pb-2 pr-4 font-medium text-slate-500">Action</th>
            <th className="pb-2 pr-4 font-medium text-slate-500">Actor</th>
            <th className="pb-2 pr-4 font-medium text-slate-500">Note</th>
            <th className="pb-2 font-medium text-slate-500 text-right">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="py-3 pr-4">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${actionColor[e.action] ?? 'text-slate-600 bg-slate-100'}`}>
                  {actionLabel[e.action] ?? e.action}
                </span>
              </td>
              <td className="py-3 pr-4 text-slate-700">
                {e.profiles?.full_name ?? 'System'}
              </td>
              <td className="py-3 pr-4 text-slate-500">
                {e.metadata?.reason ? `Reason: ${e.metadata.reason}` : '—'}
              </td>
              <td className="py-3 text-right text-slate-400 whitespace-nowrap">
                {timeAgo(e.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
