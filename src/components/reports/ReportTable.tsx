interface Column {
  header: string
  className?: string
}

interface Props {
  columns: Column[]
  children: React.ReactNode
  empty?: string
  rowCount?: number
}

export function ReportTable({ columns, children, empty = 'No records found.', rowCount }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {rowCount !== undefined && (
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-medium text-slate-500">{rowCount} record{rowCount !== 1 ? 's' : ''}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {children}
          </tbody>
        </table>
      </div>
      {rowCount === 0 && (
        <p className="px-5 py-8 text-center text-sm italic text-slate-400">{empty}</p>
      )}
    </div>
  )
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 text-slate-700 ${className ?? ''}`}>{children}</td>
  )
}
