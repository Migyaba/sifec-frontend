import { CircleSlash, Send } from "lucide-react"

import { cn } from "@/lib/utils"

import type { BidStatus } from "../api"
import { BID_STATUS } from "../labels"

const STYLE: Record<BidStatus, string> = {
  preparing: "bg-blue-50 text-blue-800",
  no_go: "bg-muted text-ink-muted",
  ready: "bg-blue-900 text-white",
  filed: "bg-muted text-ink",
  result_known: "bg-muted text-ink",
  closed: "bg-muted text-ink-muted",
}

export function BidStatusBadge({ status }: { status: BidStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-semibold whitespace-nowrap", STYLE[status])}>
      {status === "no_go" ? <CircleSlash className="size-3.5" aria-hidden="true" /> : null}
      {status === "filed" ? <Send className="size-3.5" aria-hidden="true" /> : null}
      {BID_STATUS[status]}
    </span>
  )
}
