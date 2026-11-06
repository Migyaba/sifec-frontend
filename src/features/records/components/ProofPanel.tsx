import { useQuery } from "@tanstack/react-query"
import { FileText, Link2, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

import { api, ApiError, call, fieldErrors, userMessage } from "@/api"
import { useConfirm } from "@/components/confirm"
import { SearchBox } from "@/components/data"
import { ConfidenceTag } from "@/components/sifec/confidence"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { useAddEvidence, useConfidence, useEvidence, useRemoveEvidence, type Evidence } from "../api"
import { EVIDENCE_ORIGIN_LABEL, levelOf, MATCH_LABEL } from "../labels"

export type ProofField = { key: string; label: string; value: React.ReactNode }

/** Ce que l'écran sait d'un champ : son libellé et sa valeur affichée. `null` : champ ignoré ici. */
export type DescribeField = (key: string) => { label: string; value: React.ReactNode } | null

type Picked = { versionId: string; title: string; pages: number }

/** Choix de la pièce source parmi les documents lus de la base. */
function DocumentPicker({ picked, onPick }: { picked: Picked | null; onPick: (picked: Picked | null) => void }) {
  const [q, setQ] = useState("")
  const results = useQuery({
    queryKey: ["documents", "picker", q],
    queryFn: () => call(api.GET("/api/v1/documents/", { params: { query: { q, status: "ready" } } })),
    enabled: q.trim().length >= 2,
  })

  if (picked) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[0.8125rem]">
        <FileText className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-semibold text-blue-900">{picked.title}</span>
        <span className="tabular text-xs text-blue-800">{picked.pages} page(s)</span>
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => onPick(null)} aria-label="Choisir une autre pièce">
          <X aria-hidden="true" />
        </Button>
      </div>
    )
  }
  const rows = results.data?.results.filter((doc) => doc.current_version) ?? []
  return (
    <div className="space-y-2">
      <SearchBox value={q} onSearch={setQ} label="Rechercher la pièce source" placeholder="Titre de la pièce, deux lettres au moins…" />
      {q.trim().length >= 2 ? (
        <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg ring-1 ring-line" aria-label="Pièces trouvées">
          {results.isPending ? <li className="px-3 py-2 text-xs text-ink-muted">Recherche…</li> : null}
          {results.isError ? <li className="px-3 py-2 text-xs text-block">{userMessage(results.error)}</li> : null}
          {results.isSuccess && !rows.length ? <li className="px-3 py-2 text-xs text-ink-muted">Aucune pièce lue ne correspond.</li> : null}
          {rows.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] hover:bg-muted"
                onClick={() =>
                  onPick({ versionId: doc.current_version!.id, title: doc.title, pages: doc.current_version!.page_count })
                }
              >
                <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                <span className="tabular text-xs text-ink-muted">{doc.current_version!.page_count} p.</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function AddEvidence({ recordType, recordId, field, onClose }: { recordType: string; recordId: string; field: ProofField; onClose: () => void }) {
  const add = useAddEvidence(recordType, recordId)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [page, setPage] = useState("1")
  const [quote, setQuote] = useState("")
  const errors = add.error instanceof ApiError && add.error.code === "invalid" ? fieldErrors(add.error.details) : {}
  const general = add.error && !Object.keys(errors).length ? userMessage(add.error) : (errors.non_field_errors ?? errors.field)?.join(" ")

  return (
    <form
      className="mt-3 space-y-3 rounded-lg bg-ground p-3 ring-1 ring-line"
      onSubmit={(event) => {
        event.preventDefault()
        if (!picked) return
        add.mutate(
          { field: field.key, document_version_id: picked.versionId, page_number: Number(page), quote: quote.trim(), origin: "manual" },
          { onSuccess: onClose },
        )
      }}
    >
      <p className="text-xs text-ink-muted">
        Rattacher une preuve modifie la fiche : elle repasse en brouillon, et vous comptez parmi ses auteurs.
      </p>
      <DocumentPicker picked={picked} onPick={setPicked} />
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <div className="space-y-1">
          <Label htmlFor={`${field.key}-page`}>Page</Label>
          <Input
            id={`${field.key}-page`}
            type="number"
            min={1}
            max={picked?.pages || undefined}
            value={page}
            onChange={(event) => setPage(event.target.value)}
            aria-invalid={errors.page_number ? true : undefined}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${field.key}-quote`}>Extrait (facultatif)</Label>
          <Textarea
            id={`${field.key}-quote`}
            rows={2}
            value={quote}
            onChange={(event) => setQuote(event.target.value)}
            placeholder="Le passage qui donne la valeur : il est recherché dans la page."
            aria-invalid={errors.quote ? true : undefined}
          />
        </div>
      </div>
      {errors.page_number || errors.quote || general ? (
        <p role="alert" className="text-xs font-semibold text-block">
          {[errors.page_number, errors.quote].flat().filter(Boolean).join(" ") || general}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={!picked || add.isPending}>
          <Link2 data-icon="inline-start" aria-hidden="true" />
          Rattacher la preuve
        </Button>
      </div>
    </form>
  )
}

function EvidenceItem({ evidence, onRemove }: { evidence: Evidence; onRemove?: () => void }) {
  const match = MATCH_LABEL[evidence.quote ? evidence.match : "none"] ?? evidence.match
  return (
    <li className="flex items-start gap-2.5 py-2">
      <FileText className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-[0.8125rem]">
        <Link to={`/documents/${evidence.document_id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
          {evidence.document_title}
        </Link>
        <span className="tabular text-ink-muted"> · page {evidence.page_number}</span>
        {evidence.quote ? <q className="mt-0.5 block text-xs text-ink">{evidence.quote}</q> : null}
        <span className={cn("mt-0.5 block text-2xs", evidence.match === "not_found" ? "font-semibold text-block" : "text-ink-muted")}>
          {match} · {EVIDENCE_ORIGIN_LABEL[evidence.origin] ?? evidence.origin}
        </span>
      </div>
      {onRemove ? (
        <Button size="icon-sm" variant="ghost" onClick={onRemove} aria-label={`Retirer la preuve ${evidence.document_title}, page ${evidence.page_number}`}>
          <Trash2 aria-hidden="true" />
        </Button>
      ) : null}
    </li>
  )
}

/**
 * Preuve de chaque valeur vérifiable (synthèse, §4.1) : son niveau, ses raisons, et les pièces
 * sources qui l'établissent. Rien n'est jugé ici : la liste des champs à prouver et leur niveau
 * viennent du serveur ; l'écran ne fournit que les libellés et les valeurs.
 */
export function ProofPanel({
  recordType,
  recordId,
  describe,
  editable,
}: {
  recordType: string
  recordId: string
  describe: DescribeField
  editable: boolean
}) {
  const confidence = useConfidence(recordType, recordId)
  const evidence = useEvidence(recordType, recordId)
  const remove = useRemoveEvidence(recordType, recordId)
  const confirm = useConfirm()
  const [adding, setAdding] = useState<string | null>(null)
  const byField = new Map(confidence.data?.by_field.map((item) => [item.field, item]))
  const overall = confidence.data ? levelOf(confidence.data.level) : null
  const fields: ProofField[] = (confidence.data?.by_field ?? []).flatMap((item) => {
    const known = describe(item.field)
    return known ? [{ key: item.field, ...known }] : []
  })

  return (
    <section aria-labelledby="preuves-title" className="rounded-xl bg-card ring-1 ring-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="preuves-title" className="text-sm font-extrabold text-ink">
          Preuves
        </h2>
        {overall ? <ConfidenceTag level={overall} /> : null}
      </div>
      {confidence.isError || evidence.isError ? (
        <p role="alert" className="px-4 py-3 text-xs font-semibold text-block">
          {userMessage(confidence.error ?? evidence.error)}
        </p>
      ) : null}
      {confidence.isPending ? <p className="px-4 py-3 text-xs text-ink-muted">Chargement des preuves…</p> : null}
      {confidence.isSuccess && !fields.length ? (
        <p className="px-4 py-3 text-[0.8125rem] text-ink-muted">Aucune valeur de cette fiche ne demande de pièce source.</p>
      ) : null}
      <ul className="divide-y divide-line">
        {fields.map((field) => {
          const state = byField.get(field.key)
          const level = state ? levelOf(state.level) : null
          const items = (evidence.data ?? []).filter((item) => item.field === field.key)
          return (
            <li key={field.key} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-ink-muted">{field.label}</div>
                  <div className="mt-0.5 text-[0.8125rem] font-semibold text-ink">
                    {field.value || <span className="font-normal text-ink-muted">Non renseigné</span>}
                  </div>
                </div>
                {level ? <ConfidenceTag level={level} /> : null}
              </div>
              {state?.reasons.length ? (
                <ul className="mt-1.5 space-y-0.5 text-xs text-ink-muted">
                  {state.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
              {items.length ? (
                <ul className="mt-1 divide-y divide-line" aria-label={`Preuves de ${field.label}`}>
                  {items.map((item) => (
                    <EvidenceItem
                      key={item.id}
                      evidence={item}
                      onRemove={
                        editable
                          ? async () => {
                              const answer = await confirm({
                                title: "Retirer cette preuve ?",
                                description: "La fiche repassera en brouillon, et la valeur perdra cette pièce source.",
                                confirmLabel: "Retirer",
                                tone: "danger",
                              })
                              if (answer) remove.mutate(item.id)
                            }
                          : undefined
                      }
                    />
                  ))}
                </ul>
              ) : null}
              {editable && adding !== field.key ? (
                <Button variant="link" size="sm" className="mt-1 px-0" onClick={() => setAdding(field.key)}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Ajouter une preuve
                </Button>
              ) : null}
              {adding === field.key ? (
                <AddEvidence recordType={recordType} recordId={recordId} field={field} onClose={() => setAdding(null)} />
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
