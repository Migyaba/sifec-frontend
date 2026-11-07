import { Check, CircleDashed, Loader2, OctagonX } from "lucide-react"

import { cn } from "@/lib/utils"

import { BATCH_STATUS, type BatchStatus } from "../api"

const STYLE: Record<BatchStatus, string> = {
  draft: "bg-muted text-ink",
  scanning: "bg-blue-50 text-blue-800",
  scanned: "bg-blue-50 text-blue-800",
  running: "bg-blue-50 text-blue-800",
  submitted: "bg-muted text-ink",
  failed: "bg-block-soft text-block",
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const spinning = status === "scanning" || status === "running"
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-semibold whitespace-nowrap", STYLE[status])}>
      {spinning ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
      {status === "failed" ? <OctagonX className="size-3.5" aria-hidden="true" /> : null}
      {status === "draft" ? <CircleDashed className="size-3.5" aria-hidden="true" /> : null}
      {/* Une coche simple : le document coché est réservé aux validations humaines. */}
      {status === "submitted" ? <Check className="size-3.5" aria-hidden="true" /> : null}
      {BATCH_STATUS[status]}
    </span>
  )
}
