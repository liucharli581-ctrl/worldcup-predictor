import { getFlagEmoji } from "@/lib/team-flags"
import { cn } from "@/lib/utils"

interface TeamFlagProps {
  fifaCode?: string | null
  country?: string | null
  size?: number
  className?: string
  showEmojiFallback?: boolean
}

function getFlagPath(fifaCode?: string | null): string | null {
  if (!fifaCode) return null
  return `/images/flags/${fifaCode.toUpperCase()}.webp`
}

export function TeamFlag({
  fifaCode,
  country,
  size = 24,
  className,
  showEmojiFallback = true,
}: TeamFlagProps) {
  const src = getFlagPath(fifaCode)

  if (!src) {
    if (showEmojiFallback) {
      return (
        <span className={cn("inline-block", className)} role="img" aria-label={country ?? ""}>
          {getFlagEmoji(country)}
        </span>
      )
    }
    return null
  }

  return (
    <img
      src={src}
      alt={country ?? fifaCode ?? ""}
      width={size}
      height={size}
      className={cn("inline-block object-contain rounded-sm", className)}
      loading="lazy"
      onError={(e) => {
        if (showEmojiFallback) {
          const target = e.currentTarget
          const fallback = document.createElement("span")
          fallback.className = target.className
          fallback.setAttribute("role", "img")
          fallback.setAttribute("aria-label", country ?? "")
          fallback.textContent = getFlagEmoji(country)
          target.replaceWith(fallback)
        }
      }}
    />
  )
}

export { getFlagPath }
