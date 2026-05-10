interface Props {
  size?: number
  className?: string
}

export function ClearworkMark({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="7" fill="#f97316" />
      <path
        d="M7.5 16.5L13 22L24.5 10"
        stroke="white"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
