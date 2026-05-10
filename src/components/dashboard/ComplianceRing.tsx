'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

type Props = {
  score: number
  cleared: number
  total: number
}

export function ComplianceRing({ score, cleared, total }: Props) {
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444'
  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Needs Attention' : 'Critical'
  const data = [{ value: score }, { value: Math.max(0, 100 - score) }]

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="relative h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={76}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold leading-none text-slate-900">{score}</span>
          <span className="text-sm font-semibold text-slate-400">%</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-bold text-slate-800">Compliance Score</p>
      <p className="text-xs font-medium" style={{ color }}>{label}</p>
      {total > 0 && (
        <p className="mt-1 text-xs text-slate-400">{cleared} of {total} workers cleared</p>
      )}
    </div>
  )
}
