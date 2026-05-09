interface Sig {
  id: string
  printed_name: string
  signature_data: string | null
  worker_identifier: string | null
  signed_at: string
}

export function JhaAttendeeList({ signatures }: { signatures: Sig[] }) {
  if (!signatures.length) {
    return (
      <p className="py-4 text-sm text-slate-500 italic">No signatures recorded yet.</p>
    )
  }

  return (
    <ul className="divide-y divide-slate-100">
      {signatures.map((sig) => (
        <li key={sig.id} className="flex items-start gap-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{sig.printed_name}</p>
            {sig.worker_identifier && (
              <p className="text-xs text-slate-500">ID: {sig.worker_identifier}</p>
            )}
            <p className="mt-0.5 text-xs text-slate-400">
              {new Date(sig.signed_at).toLocaleString()}
            </p>
          </div>
          {sig.signature_data && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sig.signature_data}
              alt={`${sig.printed_name}'s signature`}
              className="h-12 w-32 shrink-0 rounded border border-slate-200 bg-white object-contain p-1"
            />
          )}
        </li>
      ))}
    </ul>
  )
}
