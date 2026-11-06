import { useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Download, FileStack, FileUp, Loader2, X } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router"

import { ApiError, userMessage } from "@/api"
import { DataTable, type Column } from "@/components/data"
import { Notice } from "@/components/sifec/notice"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { FileDrop, formatBytes, UploadList, useUploads } from "@/components/upload"
import { cn } from "@/lib/utils"

import {
  documentKeys,
  downloadUrl,
  trackProcessing,
  useDocument,
  useSetIssuedOn,
  useSetKind,
  shownVersion,
  useVersionPages,
  type DocumentVersion,
} from "../api"
import { LegibilityTag, StatusBadge } from "../components/badges"
import { formatDateTime } from "../format"
import { KIND_LABEL, KIND_SOURCE_LABEL, KINDS, ORIGIN_LABEL, TEXT_SOURCE_LABEL, type DocumentKind } from "../labels"

const API_PAGE_SIZE = 50

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-[0.8125rem] text-ink">{children || <span className="text-ink-muted">Non renseigné</span>}</dd>
    </div>
  )
}

function DownloadButton({ version }: { version: DocumentVersion }) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle")
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy")
          try {
            // Adresse signée, valable quelques minutes : demandée au moment du clic.
            window.location.assign(await downloadUrl(version.id))
            setState("idle")
          } catch {
            setState("error")
          }
        }}
      >
        {state === "busy" ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <Download data-icon="inline-start" aria-hidden="true" />}
        Télécharger
      </Button>
      {state === "error" ? <span className="text-xs font-semibold text-block">Le téléchargement a échoué. Réessayez.</span> : null}
    </div>
  )
}

function KindField({ documentId, kind, source }: { documentId: string; kind: DocumentKind; source: keyof typeof KIND_SOURCE_LABEL }) {
  const setKind = useSetKind(documentId)
  return (
    <div className="space-y-1">
      <Label htmlFor="kind">Type de pièce</Label>
      <Select value={kind} onValueChange={(next) => setKind.mutate(next as DocumentKind)} disabled={setKind.isPending}>
        <SelectTrigger id="kind" className="w-[min(20rem,100%)]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {KINDS.map((option) => (
            <SelectItem key={option} value={option}>
              {KIND_LABEL[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className={cn("text-xs", source === "ai" ? "font-semibold text-check" : "text-ink-muted")}>
        {setKind.isError ? <span className="text-block">{userMessage(setKind.error)}</span> : KIND_SOURCE_LABEL[source]}
      </p>
    </div>
  )
}

function IssuedOnField({ documentId, version }: { documentId: string; version: DocumentVersion }) {
  const save = useSetIssuedOn(documentId)
  const [value, setValue] = useState(version.issued_on ?? "")
  const changed = value !== (version.issued_on ?? "")
  const message =
    save.error instanceof ApiError && save.error.code === "invalid"
      ? Object.values((save.error.details as Record<string, string[]>) ?? {}).flat().join(" ")
      : save.error
        ? userMessage(save.error)
        : null
  return (
    <form
      className="space-y-1"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate({ versionId: version.id, issuedOn: value || null })
      }}
    >
      <Label htmlFor="issued-on">Date d'émission</Label>
      <div className="flex items-center gap-2">
        <Input id="issued-on" type="date" value={value} onChange={(event) => setValue(event.target.value)} className="w-[min(11rem,100%)]" />
        {changed ? (
          <Button type="submit" size="sm" disabled={save.isPending}>
            Enregistrer
          </Button>
        ) : null}
      </div>
      <p className={cn("text-xs", message ? "font-semibold text-block" : "text-ink-muted")}>
        {message ?? "Date imprimée sur la pièce. Elle sert à juger sa validité à une date donnée."}
      </p>
    </form>
  )
}

/** Lecture du texte, page par page : ce que les contrôles et la recherche lisent vraiment. */
function PageReader({ version }: { version: DocumentVersion }) {
  const [number, setNumber] = useState(1)
  const total = version.page_count
  const apiPage = Math.ceil(number / API_PAGE_SIZE)
  const pages = useVersionPages(version.status === "ready" || version.status === "duplicate" ? version.id : undefined, apiPage)
  const shown = pages.data?.results.find((item) => item.number === number)

  if (!total) {
    return <p className="text-[0.8125rem] text-ink-muted">Aucune page lue pour cette version.</p>
  }
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
        <Button variant="outline" size="icon-sm" disabled={number <= 1} onClick={() => setNumber(number - 1)} aria-label="Page précédente">
          <ChevronLeft aria-hidden="true" />
        </Button>
        <span className="tabular text-xs font-semibold text-ink" aria-live="polite">
          Page {number} sur {total}
        </span>
        <Button variant="outline" size="icon-sm" disabled={number >= total} onClick={() => setNumber(number + 1)} aria-label="Page suivante">
          <ChevronRight aria-hidden="true" />
        </Button>
        {shown ? (
          <span className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
            {TEXT_SOURCE_LABEL[shown.source]}
            <LegibilityTag legibility={shown.legibility} score={shown.legibility_score} />
          </span>
        ) : null}
      </div>
      <div role="region" aria-label={`Texte de la page ${number}`} className="max-h-[60vh] overflow-y-auto px-5 py-4">
        {pages.isPending ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[75%]" />
            <Skeleton className="h-4 w-[82%]" />
          </div>
        ) : pages.isError ? (
          <p role="alert" className="text-[0.8125rem] font-semibold text-block">
            {userMessage(pages.error)}
          </p>
        ) : shown?.text ? (
          // Texte brut : jamais interprété comme du HTML.
          <p className="max-w-[80ch] text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink">{shown.text}</p>
        ) : (
          <p className="text-[0.8125rem] text-ink-muted">Aucun texte lu sur cette page.</p>
        )}
      </div>
    </div>
  )
}

const VERSION_COLUMNS: Column<DocumentVersion>[] = [
  { key: "number", header: "Version", numeric: true, cell: (row) => <span className="font-semibold">v{row.number}</span> },
  { key: "file", header: "Fichier", wrap: true, cell: (row) => <span className="break-words">{row.original_filename}</span> },
  { key: "status", header: "Lecture", cell: (row) => <StatusBadge status={row.status} /> },
  { key: "legibility", header: "Lisibilité", cell: (row) => (row.status === "ready" ? <LegibilityTag legibility={row.legibility} score={row.legibility_score} /> : null) },
  { key: "pages", header: "Pages", align: "right", numeric: true, cell: (row) => row.page_count || "" },
  { key: "size", header: "Taille", align: "right", numeric: true, secondary: true, cell: (row) => formatBytes(row.size) },
  { key: "created", header: "Ajoutée le", cell: (row) => <span className="text-ink-muted">{formatDateTime(row.created_at)}</span> },
]

export function DocumentPage() {
  const { id = "" } = useParams()
  const document = useDocument(id)
  const client = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [reading, setReading] = useState<string | null>(null)
  const uploads = useUploads({
    documentId: id,
    onDone: (version) => {
      void client.invalidateQueries({ queryKey: documentKeys.detail(id) })
      trackProcessing(version, () => void client.invalidateQueries({ queryKey: documentKeys.all }))
    },
  })

  if (document.isPending) {
    return (
      <Page>
        <Skeleton className="h-8 w-[40%]" />
        <Skeleton className="mt-6 h-40 w-full" />
      </Page>
    )
  }
  if (document.isError) {
    return (
      <Page>
        <Notice tone={document.error instanceof ApiError && document.error.status === 404 ? "info" : "block"} title="Document indisponible">
          {userMessage(document.error)}
        </Notice>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/documents">Revenir aux documents</Link>
        </Button>
      </Page>
    )
  }

  const doc = document.data
  const current = shownVersion(doc)
  if (!current) {
    return (
      <Page>
        <Notice tone="block" title="Document sans fichier">
          Aucune version n'est enregistrée pour ce document.
        </Notice>
      </Page>
    )
  }
  const read = doc.versions.find((version) => version.id === reading) ?? current

  return (
    <Page>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-xs font-semibold text-ink-muted">
        <Link to="/documents" className="hover:text-ink hover:underline">
          Documents
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{doc.title}</span>
      </nav>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-[68ch]">
          <h1 className="text-2xl leading-tight font-extrabold break-words text-ink">{doc.title}</h1>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">
            Version {current.number} · {current.original_filename}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button variant={adding ? "outline" : "secondary"} onClick={() => setAdding((open) => !open)}>
            {adding ? <X data-icon="inline-start" aria-hidden="true" /> : <FileUp data-icon="inline-start" aria-hidden="true" />}
            {adding ? "Fermer" : "Nouvelle version"}
          </Button>
          <DownloadButton version={current} />
        </div>
      </header>

      {adding ? (
        <section aria-label="Nouvelle version" className="mb-6">
          <FileDrop
            onFiles={uploads.add}
            multiple={false}
            hint="La nouvelle version remplace l'actuelle ; les précédentes restent consultables."
          />
          <UploadList items={uploads.items} onResume={uploads.resume} onRemove={uploads.remove} />
        </section>
      ) : null}

      <div className="mb-6 space-y-3">
        {current.status === "failed" ? (
          <Notice tone="block" title="Le fichier n'a pas pu être lu">
            {current.error || "Déposez une nouvelle version, ou prévenez l'administrateur."}
          </Notice>
        ) : null}
        {current.origin === "platform_generated" ? (
          <Notice tone="info" title="Produit par la plateforme">
            Ce document a été produit par SIFEC Offrea : il ne prouve aucun fait et ne peut pas servir de pièce source.
          </Notice>
        ) : null}
        {current.status === "duplicate" ? (
          <Notice tone="info" title="Doublon exact">
            Ce fichier est identique à une version déjà dans la base : il se lit et se cite comme l'original.
          </Notice>
        ) : null}
        {current.legibility === "poor" || current.legibility === "check" ? (
          <Notice tone="check" title={current.legibility === "poor" ? "Scan peu lisible" : "Lisibilité à vérifier"}>
            Les valeurs tirées de ce document seront marquées à vérifier. Une meilleure copie peut être déposée en nouvelle version.
          </Notice>
        ) : null}
      </div>

      <section aria-label="Fiche du document" className="mb-8 grid gap-6 rounded-xl bg-card p-5 ring-1 ring-line lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <KindField documentId={doc.id} kind={doc.kind} source={doc.kind_source} />
          <IssuedOnField key={current.id} documentId={doc.id} version={current} />
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Fact label="Lecture">
            <StatusBadge status={current.status} />
          </Fact>
          <Fact label="Lisibilité">
            {current.status === "ready" ? <LegibilityTag legibility={current.legibility} score={current.legibility_score} /> : null}
          </Fact>
          <Fact label="Texte">{TEXT_SOURCE_LABEL[current.text_source]}</Fact>
          <Fact label="Pages">{current.page_count ? <span className="tabular">{current.page_count}</span> : null}</Fact>
          <Fact label="Format et taille">
            <span className="tabular uppercase">{current.file_format}</span> · <span className="tabular">{formatBytes(current.size)}</span>
          </Fact>
          <Fact label="Origine">{ORIGIN_LABEL[current.origin]}</Fact>
          <Fact label="Ajouté le">{formatDateTime(current.created_at)}</Fact>
          <Fact label="Lu le">{formatDateTime(current.processed_at)}</Fact>
          {current.original_path ? <Fact label="Emplacement d'origine"><span className="break-all">{current.original_path}</span></Fact> : null}
        </dl>
      </section>

      <section aria-labelledby="lecture-title" className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="lecture-title" className="flex items-center gap-2 text-base font-extrabold text-ink">
            <FileStack className="size-4 text-ink-muted" aria-hidden="true" />
            Texte lu, version {read.number}
          </h2>
          {read.id !== current.id ? (
            <Button variant="link" size="sm" onClick={() => setReading(null)}>
              Revenir à la version actuelle
            </Button>
          ) : null}
        </div>
        <PageReader key={read.id} version={read} />
      </section>

      <section aria-labelledby="versions-title">
        <h2 id="versions-title" className="mb-3 text-base font-extrabold text-ink">
          Versions
        </h2>
        <DataTable
          caption="Versions du document"
          columns={VERSION_COLUMNS}
          rows={doc.versions}
          rowKey={(row) => row.id}
          onRowClick={(row) => setReading(row.id)}
        />
        <p className="mt-2 text-xs text-ink-muted">Cliquez sur une version pour en lire le texte. Rien n'est jamais écrasé.</p>
      </section>
    </Page>
  )
}
