import { FilePlus2, Loader2, X } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

import { userMessage } from "@/api"
import { FileDrop, UploadList, useUploads } from "@/components/upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DocumentPicker } from "@/features/records"
import { cn } from "@/lib/utils"

import { messageOf } from "../messages"
import { useAddDocument, useTenderDocuments, type TenderDocumentKind } from "../api"
import { AMENDING, DOCUMENT_KIND, READING } from "../labels"

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" })

type Source = { versionId: string; title: string }

/** Rattacher un document : déposé maintenant, ou déjà dans la base. */
function AddDocument({ tenderId, hasSheet, onClose }: { tenderId: string; hasSheet: boolean; onClose: () => void }) {
  const add = useAddDocument(tenderId)
  const [kind, setKind] = useState<TenderDocumentKind>("notice")
  const [label, setLabel] = useState("")
  const [receivedOn, setReceivedOn] = useState("")
  const [source, setSource] = useState<Source | null>(null)
  const [mode, setMode] = useState<"upload" | "pick">("upload")
  const uploads = useUploads({ onDone: (version) => setSource({ versionId: version.id, title: version.original_filename }) })

  return (
    <form
      aria-label="Ajouter un document à l'avis"
      className="space-y-4 border-t border-line px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!source) return
        add.mutate({ kind, document_version: source.versionId, label: label.trim(), received_on: receivedOn || null }, { onSuccess: onClose })
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-extrabold text-ink">Ajouter un document</h3>
        <Button type="button" size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fermer">
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="document-kind">Nature du document</Label>
          <Select value={kind} onValueChange={(value) => setKind(value as TenderDocumentKind)}>
            <SelectTrigger id="document-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENT_KIND).map(([value, text]) => (
                <SelectItem key={value} value={value}>
                  {text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="document-label">Intitulé (facultatif)</Label>
          <Input id="document-label" value={label} placeholder="Additif n° 1" onChange={(event) => setLabel(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="document-received">Reçu le</Label>
          <Input id="document-received" type="date" value={receivedOn} onChange={(event) => setReceivedOn(event.target.value)} />
        </div>
      </div>
      {AMENDING.includes(kind) && hasSheet ? (
        <p className="text-xs font-semibold text-check">Rattaché, ce document relance l'extraction : une nouvelle version de la fiche montrera ce qui change.</p>
      ) : null}

      <fieldset>
        <legend className="text-sm font-medium text-ink">Fichier</legend>
        <div className="mt-1.5 inline-flex rounded-lg bg-muted p-0.5" role="radiogroup" aria-label="Origine du fichier">
          {(
            [
              ["upload", "Déposer un fichier"],
              ["pick", "Choisir dans la base"],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => {
                setMode(value)
                setSource(null)
              }}
              className={cn("rounded-md px-3 py-1.5 text-xs font-semibold", mode === value ? "bg-card text-ink shadow-xs" : "text-ink-muted hover:text-ink")}
            >
              {text}
            </button>
          ))}
        </div>
        <div className="mt-3">
          {mode === "upload" ? (
            source ? (
              <p className="text-[0.8125rem] text-ink">
                Fichier déposé : <span className="font-semibold">{source.title}</span>
              </p>
            ) : (
              <>
                <FileDrop onFiles={uploads.add} multiple={false} hint="Un fichier : PDF, Word ou image." />
                <UploadList items={uploads.items} onResume={uploads.resume} onRemove={uploads.remove} />
              </>
            )
          ) : (
            <DocumentPicker picked={source ? { ...source, pages: 0 } : null} onPick={(picked) => setSource(picked ? { versionId: picked.versionId, title: picked.title } : null)} />
          )}
        </div>
      </fieldset>
      {add.isError ? (
        <p role="alert" className="text-xs font-semibold text-block">
          {messageOf(add.error)}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={!source || add.isPending || uploads.busy}>
          {add.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <FilePlus2 data-icon="inline-start" aria-hidden="true" />}
          Rattacher à l'avis
        </Button>
      </div>
    </form>
  )
}

/** Documents de l'avis (UC06, UC14) : avis, termes de référence, formulaires, additifs. */
export function TenderDocuments({ tenderId, hasSheet }: { tenderId: string; hasSheet: boolean }) {
  const documents = useTenderDocuments(tenderId)
  const [adding, setAdding] = useState(false)
  return (
    <section aria-labelledby="tender-documents" className="rounded-xl bg-card ring-1 ring-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="tender-documents" className="text-sm font-extrabold text-ink">
          Documents de l'avis
        </h2>
        {adding ? null : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <FilePlus2 data-icon="inline-start" aria-hidden="true" />
            Ajouter un document
          </Button>
        )}
      </div>
      {documents.isError ? (
        <p className="px-4 py-3 text-[0.8125rem] text-block">{userMessage(documents.error)}</p>
      ) : documents.data?.length ? (
        <ul className="divide-y divide-line">
          {documents.data.map((document) => {
            const reading = document.reading_status
            return (
              <li key={document.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-[0.8125rem]">
                <span className={cn("w-[min(12rem,40%)] text-xs font-bold", AMENDING.includes(document.kind) ? "text-check" : "text-ink-muted")}>{DOCUMENT_KIND[document.kind]}</span>
                <Link to={`/documents/${document.document_id}`} className="min-w-0 flex-1 font-semibold text-ink hover:text-blue-700 hover:underline">
                  {document.label || document.document_title}
                </Link>
                <span className={cn("text-xs", reading === "failed" ? "font-semibold text-block" : reading === "ready" || reading === "duplicate" ? "text-ink-muted" : "text-blue-700")}>
                  {READING[reading] ?? reading}
                </span>
                {document.received_on ? <span className="text-xs text-ink-muted">reçu le {day.format(new Date(document.received_on))}</span> : null}
              </li>
            )
          })}
        </ul>
      ) : documents.isPending ? null : (
        <p className="px-4 py-4 text-[0.8125rem] text-ink-muted">Aucun document. Déposez l'avis, puis ses termes de référence et formulaires.</p>
      )}
      {adding ? <AddDocument tenderId={tenderId} hasSheet={hasSheet} onClose={() => setAdding(false)} /> : null}
    </section>
  )
}
