import { CircleAlert, CircleCheck, FileText, OctagonX } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** Niveaux de confiance de la synthèse (§4.2). Jamais la couleur seule : icône et libellé. */
export type Level = "ok" | "check" | "block"

export const LEVELS: Record<
  Level,
  { label: string; meaning: string; icon: typeof CircleCheck; text: string; soft: string; dot: string }
> = {
  ok: {
    label: "Vérifié",
    meaning: "Copié d'une fiche validée, pièce source disponible",
    icon: CircleCheck,
    text: "text-ok",
    soft: "bg-ok-soft",
    dot: "bg-ok-dot",
  },
  check: {
    label: "À vérifier",
    meaning: "Issu d'un scan, d'une reformulation ou d'une fiche non validée",
    icon: CircleAlert,
    text: "text-check",
    soft: "bg-check-soft",
    dot: "bg-check-dot",
  },
  block: {
    label: "Bloquant",
    meaning: "Sans pièce source, contradictoire ou expiré : export bloqué",
    icon: OctagonX,
    text: "text-block",
    soft: "bg-block-soft",
    dot: "bg-block-dot",
  },
}

export function ConfidenceTag({
  level,
  children,
  className,
}: {
  level: Level
  children?: React.ReactNode
  className?: string
}) {
  const { icon: Icon, label, text, soft } = LEVELS[level]
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-semibold",
        text,
        soft,
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
      {children ?? label}
    </span>
  )
}

export type Source = {
  document: string
  page?: number
  extractedOn?: string
  validatedBy?: string
  note?: string
}

/**
 * Le fil de preuve : une valeur, son niveau, et la pièce dont elle est recopiée.
 * La pastille ouvre la fiche de preuve.
 */
export function Proof({
  level,
  source,
  children,
  className,
}: {
  level: Level
  source?: Source
  children: React.ReactNode
  className?: string
}) {
  const meta = LEVELS[level]
  const Icon = meta.icon
  return (
    <span className={cn("inline-flex max-w-full items-baseline gap-1.5", className)}>
      <span className="min-w-0 font-semibold text-ink">{children}</span>
      <Popover>
        <PopoverTrigger
          className={cn(
            "inline-flex h-5 translate-y-[0.2em] items-center gap-1 rounded-[5px] px-1 text-2xs font-bold whitespace-nowrap transition-colors",
            meta.text,
            meta.soft,
            "hover:brightness-95",
          )}
          aria-label={`${meta.label}${source ? `, source : ${source.document}` : ""}`}
        >
          <Icon className="size-3" strokeWidth={2.5} aria-hidden="true" />
          {source?.page ? `p. ${source.page}` : meta.label}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className={cn("flex items-center gap-2 rounded-t-lg px-3.5 py-2.5", meta.soft)}>
            <Icon className={cn("size-4", meta.text)} strokeWidth={2.25} aria-hidden="true" />
            <div className={cn("text-sm font-bold", meta.text)}>{meta.label}</div>
          </div>
          <div className="space-y-3 px-3.5 py-3">
            <p className="text-xs text-ink-muted">{meta.meaning}.</p>
            {source ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                <dt className="text-ink-muted">Pièce</dt>
                <dd className="flex items-start gap-1.5 font-semibold text-ink">
                  <FileText className="mt-px size-3.5 shrink-0 text-blue-600" aria-hidden="true" />
                  {source.document}
                </dd>
                {source.page ? (
                  <>
                    <dt className="text-ink-muted">Page</dt>
                    <dd className="tabular text-ink">{source.page}</dd>
                  </>
                ) : null}
                {source.extractedOn ? (
                  <>
                    <dt className="text-ink-muted">Extrait le</dt>
                    <dd className="tabular text-ink">{source.extractedOn}</dd>
                  </>
                ) : null}
                {source.validatedBy ? (
                  <>
                    <dt className="text-ink-muted">Fiche validée par</dt>
                    <dd className="text-ink">{source.validatedBy}</dd>
                  </>
                ) : null}
              </dl>
            ) : (
              <p className="text-xs font-semibold text-block">Aucune pièce source.</p>
            )}
            {source?.note ? <p className="text-xs text-ink">{source.note}</p> : null}
          </div>
        </PopoverContent>
      </Popover>
    </span>
  )
}

/** Une valeur absente n'est jamais devinée : elle s'affiche et bloque l'export. */
export function Missing({ what }: { what?: string }) {
  return (
    <span
      className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-block/50 bg-block-soft px-1.5 text-xs font-extrabold tracking-[0.04em] text-block"
      title={what ? `${what} : aucune fiche ne donne cette valeur` : undefined}
    >
      <OctagonX className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
      MANQUANT
    </span>
  )
}
