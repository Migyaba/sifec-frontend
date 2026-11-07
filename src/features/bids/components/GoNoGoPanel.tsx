import { Loader2, PenLine, RefreshCw } from "lucide-react"
import { useId, useState } from "react"

import { ConfidenceTag } from "@/components/sifec/confidence"
import { Notice } from "@/components/sifec/notice"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

import { useAssessment, useEvaluate, useSetCriterion, type Criterion, type CriterionResult } from "../api"
import { CRITERION } from "../labels"
import { problemsOf } from "../messages"

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

/** Appréciation d'un critère par une personne : un résultat, et sa justification. */
function Judge({ bidId, criterion, onDone }: { bidId: string; criterion: Criterion; onDone: () => void }) {
  const id = useId()
  const save = useSetCriterion(bidId)
  const [result, setResult] = useState<CriterionResult>(criterion.manual_result ?? criterion.result)
  const [note, setNote] = useState(criterion.manual_note)
  return (
    <form
      noValidate
      aria-label={`Apprécier : ${criterion.label}`}
      className="mt-2 space-y-3 rounded-lg bg-muted/60 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate({ key: criterion.key, result, note: note.trim() }, { onSuccess: onDone })
      }}
    >
      <RadioGroup value={result} onValueChange={(next) => setResult(next as CriterionResult)} className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Appréciation">
        {(Object.keys(CRITERION) as CriterionResult[]).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <RadioGroupItem value={key} id={`${id}-${key}`} />
            <Label htmlFor={`${id}-${key}`} className="text-[0.8125rem] font-normal">
              {CRITERION[key].label}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-note`}>Justification</Label>
        <Textarea id={`${id}-note`} rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Aucun lien avec l'autorité contractante ni avec les bureaux d'études du projet…" />
      </div>
      {save.isError ? <Notice tone="block" title="Appréciation non enregistrée">{problemsOf(save.error).join(" ")}</Notice> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={!note.trim() || save.isPending}>
          {save.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
          Enregistrer
        </Button>
      </div>
    </form>
  )
}

/**
 * Tableau Go / No-Go (synthèse, M2) : la plateforme pré-évalue chaque critère et ne dit jamais
 * « satisfait » de ce qu'elle n'a pas contrôlé ; une personne l'apprécie, avec sa justification,
 * à côté du constat. Le chef de département décide au vu de ce tableau.
 */
export function GoNoGoPanel({ bidId, established, editable, names }: { bidId: string; established: boolean; editable: boolean; names: Map<string, string> }) {
  const assessment = useAssessment(bidId, established)
  const evaluate = useEvaluate(bidId)
  const [judging, setJudging] = useState<string | null>(null)

  return (
    <section aria-labelledby="go-no-go" className="rounded-xl bg-card ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 id="go-no-go" className="text-sm font-extrabold text-ink">
            Tableau Go / No-Go
          </h2>
          {assessment.data ? <p className="text-xs text-ink-muted">Évalué le {when.format(new Date(assessment.data.evaluated_at))}</p> : null}
        </div>
        {assessment.data && editable ? (
          <Button size="sm" variant="ghost" onClick={() => evaluate.mutate(undefined)} disabled={evaluate.isPending}>
            {evaluate.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <RefreshCw data-icon="inline-start" aria-hidden="true" />}
            Réévaluer
          </Button>
        ) : null}
      </div>
      {evaluate.isError ? (
        <div className="px-4 pt-3">
          <Notice tone="block" title="Réévaluation impossible">
            {problemsOf(evaluate.error).join(" ")}
          </Notice>
        </div>
      ) : null}
      {!established || assessment.data === null ? (
        <p className="px-4 py-4 text-[0.8125rem] text-ink-muted">Le tableau est établi dès que la fiche d'exigences est validée.</p>
      ) : assessment.isError ? (
        <div className="p-4">
          <Notice tone="block" title="Tableau indisponible">
            {problemsOf(assessment.error).join(" ")}
          </Notice>
        </div>
      ) : !assessment.data ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-4 w-[45%]" />
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {assessment.data.criteria.map((criterion) => {
            const automatic = CRITERION[criterion.result]
            const manual = criterion.manual_result ? CRITERION[criterion.manual_result] : null
            return (
              <li key={criterion.key} className="px-4 py-3">
                <div className="grid gap-x-5 gap-y-2 md:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="text-[0.8125rem] font-semibold text-ink">{criterion.label}</div>
                  <div>
                    <div className="text-2xs font-semibold tracking-wide text-ink-muted uppercase">Constat de la plateforme</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <ConfidenceTag level={automatic.level}>{automatic.label}</ConfidenceTag>
                      <span className="text-xs text-ink-muted">{criterion.detail}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs font-semibold tracking-wide text-ink-muted uppercase">Appréciation</div>
                    {manual ? (
                      <div className="mt-1 space-y-1">
                        <ConfidenceTag level={manual.level}>{manual.label}</ConfidenceTag>
                        <p className="text-xs text-ink">{criterion.manual_note}</p>
                        {criterion.manual_by ? <p className="text-2xs text-ink-muted">Par {names.get(criterion.manual_by) ?? "une personne"}</p> : null}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-ink-muted">Aucune.</p>
                    )}
                    {editable && judging !== criterion.key ? (
                      <Button size="xs" variant="ghost" className="mt-1 -ml-2" onClick={() => setJudging(criterion.key)}>
                        <PenLine data-icon="inline-start" aria-hidden="true" />
                        {manual ? "Changer l'appréciation" : "Apprécier"}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {judging === criterion.key ? <Judge bidId={bidId} criterion={criterion} onDone={() => setJudging(null)} /> : null}
              </li>
            )
          })}
        </ul>
      )}
      {editable && assessment.data ? (
        <p className="border-t border-line px-4 py-2.5 text-xs text-ink-muted">
          Une appréciation change le tableau : la décision Go / No-Go se prend sur sa dernière version.
        </p>
      ) : null}
    </section>
  )
}
