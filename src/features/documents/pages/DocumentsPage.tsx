import { useQueryClient } from "@tanstack/react-query"
import { FileUp, X } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

import { DataTable, Pagination, SearchBox, useListParams, type Column } from "@/components/data"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileDrop, formatBytes, UploadList, useUploads } from "@/components/upload"

import { documentKeys, trackProcessing, useDocuments, type DocumentRow } from "../api"
import { LegibilityTag, StatusBadge } from "../components/badges"
import { formatShortDate } from "../format"
import { KIND_LABEL, KINDS, STATUS_LABEL, STATUSES } from "../labels"

const ALL = "tous"

const COLUMNS: Column<DocumentRow>[] = [
  {
    key: "title",
    header: "Document",
    wrap: true,
    cell: (row) => (
      <Link to={`/documents/${row.id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
        {row.title}
      </Link>
    ),
  },
  { key: "kind", header: "Type", cell: (row) => <span className="text-ink-muted">{KIND_LABEL[row.kind]}</span> },
  {
    key: "status",
    header: "Lecture",
    // Sans version courante, la première version n'est pas encore lue.
    cell: (row) => <StatusBadge status={row.current_version?.status ?? "pending"} />,
  },
  {
    key: "legibility",
    header: "Lisibilité",
    cell: (row) =>
      row.current_version?.status === "ready" ? (
        <LegibilityTag legibility={row.current_version.legibility} score={row.current_version.legibility_score} />
      ) : null,
  },
  {
    key: "pages",
    header: "Pages",
    align: "right",
    numeric: true,
    cell: (row) => row.current_version?.page_count || "",
  },
  {
    key: "size",
    header: "Taille",
    secondary: true,
    align: "right",
    numeric: true,
    cell: (row) => (row.current_version ? <span className="text-ink-muted">{formatBytes(row.current_version.size)}</span> : null),
  },
  {
    key: "version",
    header: "Version",
    secondary: true,
    align: "right",
    numeric: true,
    cell: (row) => (row.current_version ? <span className="text-ink-muted">v{row.current_version.number}</span> : null),
  },
  {
    key: "created",
    header: "Ajouté le",
    secondary: true,
    cell: (row) => <span className="text-ink-muted">{formatShortDate(row.created_at)}</span>,
  },
]

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string | null) => void
}) {
  return (
    <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
      <SelectTrigger className="w-[min(16rem,100%)]" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label} : tous</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Base documentaire : dépôt, recherche par titre, filtres par type et par état de lecture (UC01). */
export function DocumentsPage() {
  const { params, query, update } = useListParams(["kind", "status"])
  const documents = useDocuments(query)
  const client = useQueryClient()
  const [depositing, setDepositing] = useState(false)
  const uploads = useUploads({
    onDone: (version) => {
      void client.invalidateQueries({ queryKey: documentKeys.all })
      trackProcessing(version, () => void client.invalidateQueries({ queryKey: documentKeys.all }))
    },
  })
  const filtered = Boolean(params.q || params.filters.kind || params.filters.status)

  return (
    <Page>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[68ch]">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Documents</h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
            Toutes les pièces du Cabinet. Chaque fichier est lu à son arrivée : texte, OCR des scans, lisibilité, doublons.
          </p>
        </div>
        <Button onClick={() => setDepositing((open) => !open)} variant={depositing ? "outline" : "default"}>
          {depositing ? <X data-icon="inline-start" aria-hidden="true" /> : <FileUp data-icon="inline-start" aria-hidden="true" />}
          {depositing ? "Fermer le dépôt" : "Déposer des documents"}
        </Button>
      </header>

      {depositing ? (
        <section aria-label="Dépôt de documents" className="mb-8">
          <FileDrop onFiles={uploads.add} />
          <UploadList items={uploads.items} onResume={uploads.resume} onRemove={uploads.remove} />
        </section>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={params.q} onSearch={(q) => update({ q })} label="Rechercher un document" placeholder="Rechercher par titre…" />
        <FilterSelect
          label="Type"
          value={params.filters.kind ?? ""}
          options={KINDS.map((kind) => ({ value: kind, label: KIND_LABEL[kind] }))}
          onChange={(kind) => update({ filters: { kind } })}
        />
        <FilterSelect
          label="Lecture"
          value={params.filters.status ?? ""}
          options={STATUSES.map((status) => ({ value: status, label: STATUS_LABEL[status] }))}
          onChange={(status) => update({ filters: { status } })}
        />
      </div>

      <DataTable
        caption="Documents de la base"
        columns={COLUMNS}
        rows={documents.data?.results}
        rowKey={(row) => row.id}
        loading={documents.isFetching}
        error={documents.error}
        onRetry={() => void documents.refetch()}
        empty={
          filtered
            ? { title: "Aucun document ne correspond", hint: "Vérifiez l'orthographe, ou retirez un filtre." }
            : {
                title: "La base ne contient encore aucun document",
                hint: "Déposez les premières pièces, ou lancez la reprise de l'existant.",
                action: (
                  <Button onClick={() => setDepositing(true)}>
                    <FileUp data-icon="inline-start" aria-hidden="true" />
                    Déposer des documents
                  </Button>
                ),
              }
        }
      />
      {documents.data ? <Pagination page={params.page} count={documents.data.count} onPage={(page) => update({ page })} /> : null}
    </Page>
  )
}
