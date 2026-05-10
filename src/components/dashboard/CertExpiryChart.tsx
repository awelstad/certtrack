'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type Props = {
  data: { month: string; count: number; near: boolean }[]
}

export function CertExpiryChart({ data }: Props) {
  const hasData = data.some((d) => d.count > 0)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Cert Expiry — Next 6 Months
        </h3>
        {!hasData && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            All clear
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barSize={32} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide allowDecimals={false} />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
              fontSize: 12,
            }}
            formatter={(v) => [`${v} cert${Number(v) !== 1 ? 's' : ''}`, 'Expiring']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.near ? '#ef4444' : '#f97316'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-red-400" /> Within 60 days
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-orange-400" /> 60–180 days
        </span>
      </div>
    </div>
  )
}
