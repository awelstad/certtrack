interface Props {
  orgName: string
  logoUrl?: string | null
  brandColor?: string | null
  title: string
  subtitle?: string
}

export function ReportPrintHeader({ orgName, logoUrl, brandColor, title, subtitle }: Props) {
  const bg = brandColor ?? '#0f172a'
  return (
    <div
      className="mb-6 flex items-center gap-4 rounded-xl px-5 py-4"
      style={{ backgroundColor: bg }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={orgName} className="h-8 w-auto max-w-[120px] object-contain" />
      ) : null}
      <div className="flex-1">
        <p className="text-xs font-medium text-white/70">{orgName}</p>
        <p className="text-lg font-bold text-white">{title}</p>
      </div>
      <div className="text-right text-xs text-white/70">
        {subtitle && <p>{subtitle}</p>}
        <p>Generated {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  )
}
