import { Archive, CheckCheck, Loader2, Send, Undo2 } from "lucide-react"

import { ApiError, fieldErrors, NON_FIELD, userMessage } from "@/api"
import { useConfirm } from "@/components/confirm"
import { Notice } from "@/components/sifec/notice"
import { ValidationGlyph } from "@/components/sifec/pathway"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { contributorsOf, useCycle, type RecordBase } from "../api"
import { RECORD_STATUS_LABEL, type RecordStatus } from "../labels"

const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })

const STATUS_STYLE: Record<RecordStatus, string> = {
  draft: "bg-muted text-ink",
  to_verify: "bg-blue-50 text-blue-800",
  published: "bg-ok-soft text-ok",
  archived: "bg-muted text-ink-muted",
}

export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-bold whitespace-nowrap", STATUS_STYLE[status])}>
      {status === "published" ? <ValidationGlyph className="size-3.5" checked /> : null}
      {RECORD_STATUS_LABEL[status]}
    </span>
  )
}

/** Ce qui bloque une publication, champ par champ, dans les mots de l'écran. */
function PublicationErrors({ error, fieldLabel }: { error: unknown; fieldLabel: (field: string) => string }) {
  if (!error) return null
  if (!(error instanceof ApiError) || error.code !== "invalid") {
    return <Notice tone="block" title="L'action a échoué">{userMessage(error)}</Notice>
  }
  const entries = Object.entries(fieldErrors(error.details))
  return (
    <Notice tone="block" title="La publication est bloquée">
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {entries.map(([field, messages]) => (
          <li key={field}>
            {field === NON_FIELD ? null : <strong className="font-bold">{fieldLabel(field)} : </strong>}
            {messages.join(" ")}
          </li>
        ))}
      </ul>
    </Notice>
  )
}

/**
 * Le cycle d'une fiche (synthèse, §4.1 et §5.1) : brouillon, à vérifier, publiée, archivée. La
 * barre dit où en est la fiche, ce qu'il faut faire, et propose les seuls gestes permis. Personne
 * ne publie une fiche qu'il a modifiée ; le serveur le refuse de toute façon.
 */
export function ReviewBar({
  recordType,
  record,
  userId,
  fieldLabel,
  canArchive,
}: {
  recordType: string
  record: RecordBase
  userId: string
  fieldLabel: (field: string) => string
  canArchive: boolean
}) {
  const cycle = useCycle(recordType, record.id)
  const confirm = useConfirm()
  const mine = contributorsOf(record).includes(userId)
  const busy = Object.values(cycle).some((mutation) => mutation.isPending)
  const error = cycle.publish.error ?? cycle.submit.error ?? cycle.reject.error ?? cycle.archive.error
  const published = record.published_number
    ? `Version ${record.published_number} publiée${record.published_at ? ` le ${date.format(new Date(record.published_at))}` : ""}.`
    : "Jamais publiée."

  const reset = () => Object.values(cycle).forEach((mutation) => mutation.reset())

  return (
    <section aria-label="Vérification de la fiche" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-line">
        <RecordStatusBadge status={record.status} />
        <p className="min-w-0 flex-1 text-[0.8125rem] text-ink-muted">
          {record.status === "draft"
            ? record.published_number
              ? `Modifications en cours. ${published} Elle reste celle utilisée dans les dossiers jusqu'à la prochaine validation.`
              : "Brouillon. Quand la fiche est complète, soumettez-la : une autre personne la vérifiera."
            : record.status === "to_verify"
              ? mine
                ? "Vous avez modifié cette fiche : une autre personne doit la vérifier et la publier."
                : "Vérifiez chaque valeur contre sa pièce source, puis publiez ou renvoyez la fiche."
              : record.status === "published"
                ? `${published} Les valeurs vertes peuvent entrer dans les dossiers.`
                : "Archivée : la fiche n'est plus proposée. Ses versions publiées restent consultables."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {busy ? <Loader2 className="size-4 animate-spin text-ink-muted" aria-label="Action en cours" /> : null}
          {record.status === "draft" ? (
            <Button
              disabled={busy}
              onClick={() => {
                reset()
                cycle.submit.mutate()
              }}
            >
              <Send data-icon="inline-start" aria-hidden="true" />
              Soumettre à vérification
            </Button>
          ) : null}
          {record.status === "to_verify" ? (
            <>
              <Button
                variant="outline"
                disabled={busy || mine}
                title={mine ? "Vous avez modifié cette fiche" : undefined}
                onClick={async () => {
                  const answer = await confirm({
                    title: "Renvoyer la fiche pour correction ?",
                    description: "Elle repasse en brouillon chez ses auteurs, avec votre commentaire.",
                    confirmLabel: "Renvoyer",
                    reason: { label: "Ce qui doit être corrigé", minLength: 10 },
                  })
                  if (answer) {
                    reset()
                    cycle.reject.mutate(answer.reason)
                  }
                }}
              >
                <Undo2 data-icon="inline-start" aria-hidden="true" />
                Renvoyer pour correction
              </Button>
              <Button
                disabled={busy || mine}
                title={mine ? "Vous avez modifié cette fiche" : undefined}
                onClick={async () => {
                  const answer = await confirm({
                    title: "Publier la fiche ?",
                    description:
                      "Vous attestez avoir vérifié chaque valeur contre sa pièce source. La validation est journalisée à votre nom.",
                    confirmLabel: "Publier",
                  })
                  if (answer) {
                    reset()
                    cycle.publish.mutate()
                  }
                }}
              >
                <CheckCheck data-icon="inline-start" aria-hidden="true" />
                Publier
              </Button>
            </>
          ) : null}
          {canArchive && record.status !== "archived" ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                const answer = await confirm({
                  title: "Archiver la fiche ?",
                  description: "Elle ne sera plus proposée dans les dossiers. Ses versions publiées restent consultables.",
                  confirmLabel: "Archiver",
                  tone: "danger",
                  reason: { label: "Motif de l'archivage", minLength: 5 },
                })
                if (answer) {
                  reset()
                  cycle.archive.mutate(answer.reason)
                }
              }}
            >
              <Archive data-icon="inline-start" aria-hidden="true" />
              Archiver
            </Button>
          ) : null}
        </div>
      </div>
      {record.status === "draft" && record.review_comment ? (
        <Notice tone="check" title="Renvoyée pour correction">
          {record.review_comment}
        </Notice>
      ) : null}
      <PublicationErrors error={error} fieldLabel={fieldLabel} />
    </section>
  )
}
