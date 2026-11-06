import { CircleDashed, CircleHelp, Copy, Loader2, OctagonX } from "lucide-react"

import { ConfidenceTag } from "@/components/sifec/confidence"
import { cn } from "@/lib/utils"

import { LEGIBILITY, STATUS_LABEL, type Legibility, type VersionStatus } from "../labels"

/** État du traitement d'une version : en attente, en cours, prêt, doublon, échec. */
export function StatusBadge({ status }: { status: VersionStatus }) {
  if (status === "ready") return <span className="text-[0.8125rem] text-ink">{STATUS_LABEL.ready}</span>
  const style = {
    pending: { icon: CircleDashed, className: "bg-muted text-ink-muted", spin: false },
    processing: { icon: Loader2, className: "bg-blue-50 text-blue-800", spin: true },
    duplicate: { icon: Copy, className: "bg-muted text-ink", spin: false },
    failed: { icon: OctagonX, className: "bg-block-soft text-block", spin: false },
  }[status]
  const Icon = style.icon
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-semibold whitespace-nowrap", style.className)}>
      <Icon className={cn("size-3.5", style.spin && "animate-spin")} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  )
}

/** Lisibilité mesurée à la lecture : sur les niveaux de confiance, sauf quand elle n'est pas mesurée. */
export function LegibilityTag({ legibility, score }: { legibility: Legibility; score?: string | null }) {
  const { label, level } = LEGIBILITY[legibility]
  const percent = score ? ` ${Math.round(Number(score) * 100)} %` : ""
  if (!level) {
    return (
      <span className="inline-flex h-6 items-center gap-1 text-xs text-ink-muted">
        <CircleHelp className="size-3.5" aria-hidden="true" />
        {label}
      </span>
    )
  }
  return (
    <ConfidenceTag level={level}>
      {label}
      {percent ? <span className="tabular font-medium opacity-80">{percent}</span> : null}
    </ConfidenceTag>
  )
}
