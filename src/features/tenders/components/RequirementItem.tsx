import { Check, Pencil, Trash2 } from "lucide-react"
import { useId, useState } from "react"
import { Link } from "react-router"

import { useConfirm } from "@/components/confirm"
import { ConfidenceTag } from "@/components/sifec/confidence"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { messageOf } from "../messages"
import { useCorrect, useRemove, type Requirement, type TenderDocument } from "../api"
import { confidenceOf, DOCUMENT_KIND } from "../labels"

/** Où l'exigence est écrite : document, page et article, avec l'extrait cité. */
function Citation({ requirement, source }: { requirement: Requirement; source?: TenderDocument }) {
  if (!requirement.document_version && !requirement.quote) {
    return <p className="mt-1.5 text-xs text-ink-muted">Sans citation.</p>
  }
  const where = [source ? source.label || DOCUMENT_KIND[source.kind] : "Document de l'avis", requirement.page_number ? `page ${requirement.page_number}` : null, requirement.section || null]
    .filter(Boolean)
    .join(" · ")
  const href = requirement.document_id ? `/documents/${requirement.document_id}${requirement.page_number ? `?page=${requirement.page_number}` : ""}` : null
  return (
    <figure className="mt-2">
      {requirement.quote ? (
        <blockquote
          className={cn(
            "border-l-2 pl-3 text-[0.8125rem] leading-snug text-ink",
            requirement.match === "not_found" ? "border-block" : requirement.match === "approximate" ? "border-check" : "border-blue-300",
          )}
        >
          « {requirement.quote} »
        </blockquote>
      ) : null}
      <figcaption className="mt-1 pl-3 text-xs text-ink-muted">
        {href ? (
          <Link to={href} className="hover:text-blue-700 hover:underline">
            {where}
          </Link>
        ) : (
          where
        )}
      </figcaption>
    </figure>
  )
}

/**
 * Une exigence : la valeur retenue, ce que l'IA a lu, le point à trancher et la page qui le
 * dit. Sur la dernière version, une personne la confirme, la corrige ou la retire avec un motif.
 */
export function RequirementItem({ requirement, source, tenderId, editable }: { requirement: Requirement; source?: TenderDocument; tenderId: string; editable: boolean }) {
  const id = useId()
  const correct = useCorrect(tenderId)
  const remove = useRemove(tenderId)
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(requirement.value)
  const [note, setNote] = useState(requirement.note)
  const confidence = confidenceOf(requirement)
  const failed = correct.error ?? remove.error

  return (
    <li className={cn("px-4 py-3.5", requirement.removed && "opacity-60")} aria-label={requirement.label}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-[1_1_28rem]">
          <p className="text-xs font-bold text-ink-muted">{requirement.label}</p>
          <p className={cn("mt-0.5 text-sm font-semibold text-ink", requirement.removed && "line-through")}>{requirement.value}</p>
          {requirement.extracted_value && requirement.extracted_value !== requirement.value ? <p className="mt-0.5 text-xs text-ink-muted">Lu par l'IA : {requirement.extracted_value}</p> : null}
          {requirement.origin === "manual" ? <p className="mt-0.5 text-xs text-ink-muted">Ajoutée par une personne.</p> : null}
          {requirement.note ? (
            <p className={cn("mt-1 text-xs", requirement.status === "ambiguous" && !requirement.removed ? "font-semibold text-check" : "text-ink-muted")}>
              {requirement.removed ? "Retirée : " : requirement.status === "ambiguous" ? "À trancher : " : "Note : "}
              {requirement.note}
            </p>
          ) : null}
          <Citation requirement={requirement} source={source} />
        </div>
        <div className="flex flex-col items-end gap-2">
          {confidence && !requirement.removed ? <ConfidenceTag level={confidence.level}>{confidence.label}</ConfidenceTag> : null}
          {editable && !requirement.removed && !editing ? (
            <div className="flex gap-1">
              {requirement.status !== "confirmed" ? (
                <Button size="sm" variant="outline" disabled={correct.isPending} onClick={() => correct.mutate({ id: requirement.id })} aria-label={`Confirmer : ${requirement.label}`}>
                  <Check data-icon="inline-start" aria-hidden="true" />
                  Confirmer
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label={`Corriger : ${requirement.label}`}>
                <Pencil data-icon="inline-start" aria-hidden="true" />
                Corriger
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Retirer : ${requirement.label}`}
                disabled={remove.isPending}
                onClick={async () => {
                  const answer = await confirm({
                    title: `Retirer « ${requirement.label} » ?`,
                    description: "L'exigence quitte la fiche mais reste enregistrée, avec le motif. Elle ne reviendra pas à la prochaine version, sauf si l'avis change sur ce point.",
                    confirmLabel: "Retirer",
                    tone: "danger",
                    reason: { label: "Pourquoi la retirer", minLength: 3, placeholder: "Doublon de la date limite de dépôt" },
                  })
                  if (answer) remove.mutate({ id: requirement.id, reason: answer.reason })
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {editing ? (
        <form
          aria-label={`Corriger : ${requirement.label}`}
          className="mt-3 grid gap-3 rounded-lg bg-muted/60 p-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            correct.mutate({ id: requirement.id, value: value.trim(), note: note.trim() }, { onSuccess: () => setEditing(false) })
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-value`}>Valeur retenue</Label>
            <Textarea id={`${id}-value`} rows={2} value={value} onChange={(event) => setValue(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-note`}>Note (facultative)</Label>
            <Input id={`${id}-note`} value={note} placeholder="Confirmé par l'autorité contractante le 12 novembre" onChange={(event) => setNote(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={correct.isPending || !value.trim()}>
              Enregistrer la correction
            </Button>
          </div>
        </form>
      ) : null}
      {failed ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-block">
          {messageOf(failed)}
        </p>
      ) : null}
    </li>
  )
}
