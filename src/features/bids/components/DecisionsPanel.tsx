import { ValidationGlyph } from "@/components/sifec/pathway"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { useDecisions, type Step } from "../api"
import { problemsOf } from "../messages"

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

/**
 * Décisions prises sur le parcours, la plus récente en tête : qui, au nom de qui par délégation,
 * avec quel motif. Une validation dépassée reste, barrée, avec la raison qui l'a remise à faire.
 */
export function DecisionsPanel({ bidId, steps, names }: { bidId: string; steps: Step[]; names: Map<string, string> }) {
  const decisions = useDecisions(bidId)
  const labels = new Map(steps.map((step) => [step.key, step.label]))
  const rows = [...(decisions.data ?? [])].reverse()

  return (
    <section aria-labelledby="decisions" className="rounded-xl bg-card ring-1 ring-line">
      <h2 id="decisions" className="border-b border-line px-4 py-3 text-sm font-extrabold text-ink">
        Décisions
      </h2>
      {decisions.isPending ? (
        <Skeleton className="m-4 h-4 w-[60%]" />
      ) : decisions.isError ? (
        <p className="px-4 py-3 text-xs text-block">{problemsOf(decisions.error).join(" ")}</p>
      ) : rows.length ? (
        <ol className="divide-y divide-line">
          {rows.map((decision) => {
            const approved = decision.decision === "approved"
            const stale = Boolean(decision.invalidated_at)
            const by = names.get(decision.validated_by) ?? "une personne"
            return (
              <li key={decision.id} className="flex gap-2.5 px-4 py-2.5">
                <ValidationGlyph className={cn("mt-0.5 size-4 shrink-0", approved && !stale ? "text-ink" : "text-ink-muted")} checked={approved} />
                <div className="min-w-0 flex-1 text-[0.8125rem]">
                  <div className={cn("font-semibold text-ink", stale && "text-ink-muted line-through decoration-ink-muted/60")}>
                    {labels.get(decision.step) ?? decision.step} : {approved ? "validée" : "refusée"}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {by}
                    {decision.on_behalf_of ? `, pour ${names.get(decision.on_behalf_of) ?? "le titulaire"} par délégation écrite` : ""}, le {when.format(new Date(decision.created_at))}
                  </div>
                  {decision.comment ? <p className="mt-1 text-xs text-ink">« {decision.comment} »</p> : null}
                  {stale ? <p className="mt-1 text-xs font-semibold text-check">À refaire : {decision.invalidated_reason}</p> : null}
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="px-4 py-4 text-[0.8125rem] text-ink-muted">Aucune décision pour l'instant.</p>
      )}
    </section>
  )
}
