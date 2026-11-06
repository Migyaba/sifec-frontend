import { CalendarClock } from "lucide-react"

import { cn } from "@/lib/utils"

/** Date limite de dépôt, et jours restants : ce qui commande toute la journée. */
export function Deadline({ date, daysLeft, className }: { date: string; daysLeft: number; className?: string }) {
  const urgent = daysLeft <= 3
  const near = daysLeft <= 7
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold",
        urgent ? "bg-block-soft text-block" : near ? "bg-check-soft text-check" : "bg-muted text-ink",
        className,
      )}
    >
      <CalendarClock className="size-3.5" aria-hidden="true" />
      <span>Dépôt le {date}</span>
      <span className="tabular font-extrabold">J-{daysLeft}</span>
    </span>
  )
}
