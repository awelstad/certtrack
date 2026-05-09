import type { JhaStep } from '@/lib/jha'

export function JhaStepHazardControlTable({ steps }: { steps: JhaStep[] }) {
  if (!steps.length) {
    return <p className="text-sm italic text-slate-400">No steps defined.</p>
  }

  return (
    <div className="space-y-4">
      {steps.map((step, si) => (
        <div key={step.id} className="overflow-hidden rounded-lg border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-800 px-4 py-2.5">
            <p className="text-sm font-semibold text-white">
              Step {si + 1}: {step.description || '(no description)'}
            </p>
          </div>

          {step.hazards.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="w-1/2 px-4 py-2 text-left text-xs font-semibold text-red-700 bg-red-50">
                    Hazard
                  </th>
                  <th className="w-1/2 px-4 py-2 text-left text-xs font-semibold text-green-700 bg-green-50">
                    Controls / Safety Measures
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {step.hazards.map((hazard) => (
                  <tr key={hazard.id}>
                    <td className="px-4 py-3 align-top text-sm text-slate-700">
                      {hazard.description || '—'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {hazard.controls.filter(Boolean).length > 0 ? (
                        <ul className="space-y-1 text-sm text-slate-600">
                          {hazard.controls.filter(Boolean).map((ctrl, ci) => (
                            <li key={ci} className="flex gap-2">
                              <span className="mt-0.5 shrink-0 text-green-500">✓</span>
                              {ctrl}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-sm italic text-slate-400">No controls listed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="bg-white px-4 py-3 text-sm italic text-slate-400">
              No hazards identified for this step.
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
