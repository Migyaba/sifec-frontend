import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export type StepState = "done" | "current" | "todo" | "reopened"

export type Step = {
  key: string
  label: string
  by: string
  /** Validation humaine obligatoire et journalisée. */
  validation?: boolean
  state: StepState
}

/**
 * Le document coché du logo, dessiné au trait : il marque les validations
 * humaines du parcours, et elles seules.
 */
export function ValidationGlyph({ className, checked }: { className?: string; checked?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="none">
      <rect x="3.5" y="2" width="13" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
      {checked ? (
        <path d="M6.6 10.6 9 13l4.6-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M7 7h4M7 10h6M7 13h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  )
}

const NODE: Record<StepState, string> = {
  done: "bg-blue-900 text-white border-blue-900",
  current: "bg-card text-blue-700 border-blue-600 ring-4 ring-blue-100",
  todo: "bg-card text-ink-muted border-line-strong",
  reopened: "bg-check-soft text-check border-check-dot",
}

const VALIDATION: Record<StepState, string> = {
  done: "bg-ok-soft text-ok border-ok-dot",
  current: "bg-card text-blue-700 border-blue-600 ring-4 ring-blue-100",
  todo: "bg-card text-ink-muted border-line-strong",
  reopened: "bg-check-soft text-check border-check-dot",
}

const STATE_LABEL: Record<StepState, string> = {
  done: "faite",
  current: "en cours",
  todo: "à venir",
  reopened: "à refaire, une étape précédente a changé",
}

/** Parcours du dossier : 11 étapes pour une DDP, 8 pour un AMI (synthèse, §5.1). */
export function Pathway({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol
      className={cn("grid min-w-[58rem] items-start", className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      aria-label="Parcours du dossier"
    >
      {steps.map((step, index) => {
        const last = index === steps.length - 1
        const passed = step.state === "done"
        return (
          <li key={step.key} className="relative flex min-w-0 flex-col items-center text-center">
            {!last ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-[1.0625rem] left-[calc(50%+1.25rem)] h-0.5 w-[calc(100%-2.5rem)] rounded-full",
                  passed ? "bg-blue-900" : "bg-line-strong",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative grid size-9 place-items-center border-2 text-xs font-extrabold transition-shadow duration-300 ease-out-expo",
                step.validation ? "rounded-[0.6rem]" : "rounded-full",
                step.validation ? VALIDATION[step.state] : NODE[step.state],
              )}
            >
              {step.validation ? (
                <ValidationGlyph className="size-5" checked={step.state === "done"} />
              ) : passed ? (
                <Check className="size-4" strokeWidth={3} aria-hidden="true" />
              ) : (
                <span className="tabular">{index + 1}</span>
              )}
            </span>
            <span
              className={cn(
                "mt-2 px-1 text-xs leading-tight font-semibold",
                step.state === "current" ? "text-blue-800" : "text-ink",
                step.state === "todo" && "text-ink-muted",
              )}
            >
              {step.label}
            </span>
            <span className="mt-0.5 text-2xs text-ink-muted">{step.by}</span>
            <span className="sr-only">
              {step.validation ? "Validation, " : ""}
              {STATE_LABEL[step.state]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
