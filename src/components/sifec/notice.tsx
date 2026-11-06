import { CircleAlert, Info, OctagonX } from "lucide-react"

import { cn } from "@/lib/utils"

const TONES = {
  info: { icon: Info, box: "bg-blue-50 text-blue-900", icon_: "text-blue-600" },
  check: { icon: CircleAlert, box: "bg-check-soft text-[#5c2c07]", icon_: "text-check" },
  block: { icon: OctagonX, box: "bg-block-soft text-[#6e1610]", icon_: "text-block" },
} as const

/** Message en ligne : ce qui se passe, et ce qu'il faut faire. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof TONES
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  const { icon: Icon, box, icon_ } = TONES[tone]
  return (
    <div role={tone === "block" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg px-4 py-3", box, className)}>
      <Icon className={cn("mt-0.5 size-[1.125rem] shrink-0", icon_)} strokeWidth={2.25} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{title}</div>
        {children ? <div className="mt-0.5 text-[0.8125rem] leading-snug opacity-90">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  )
}
