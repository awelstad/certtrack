import { HardHat } from 'lucide-react'

interface Props {
  orgName: string
  logoUrl?: string | null
  brandColor?: string | null
  className?: string
}

// Applies the org's brand_color (or dark slate fallback) as background.
// Used on badge, QR, and print pages — keep it dependency-free.
export function BrandingHeader({ orgName, logoUrl, brandColor, className = '' }: Props) {
  const bg = brandColor ?? '#0f172a'

  return (
    <div
      style={{ backgroundColor: bg }}
      className={`flex items-center gap-3 px-4 py-3.5 ${className}`}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={orgName}
          className="h-7 w-auto max-w-[120px] object-contain"
        />
      ) : (
        <HardHat className="h-6 w-6 text-white/60" />
      )}
      <span className="flex-1 text-sm font-bold text-white">{orgName}</span>
    </div>
  )
}
