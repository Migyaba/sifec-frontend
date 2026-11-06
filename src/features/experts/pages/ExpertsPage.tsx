import { UserPlus } from "lucide-react"
import { Link } from "react-router"

import { DataTable, Pagination, SearchBox, useListParams, type Column } from "@/components/data"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RECORD_STATUS_LABEL, RecordStatusBadge, type RecordStatus } from "@/features/records"

import { EMPLOYMENT_LABEL, useExperts, type Employment, type Expert } from "../api"

const ALL = "tous"
const short = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" })

const COLUMNS: Column<Expert>[] = [
  {
    key: "name",
    header: "Expert",
    wrap: true,
    cell: (row) => (
      <Link to={`/experts/${row.id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
        {row.last_name} {row.first_name}
      </Link>
    ),
  },
  { key: "title", header: "Titre ou profession", wrap: true, cell: (row) => <span className="text-ink-muted">{row.title}</span> },
  { key: "employment", header: "Statut", cell: (row) => EMPLOYMENT_LABEL[row.employment] },
  { key: "status", header: "Fiche", cell: (row) => <RecordStatusBadge status={row.status} /> },
  {
    key: "cv",
    header: "Date du CV",
    secondary: true,
    cell: (row) => <span className="text-ink-muted">{row.cv_date ? short.format(new Date(`${row.cv_date}T12:00:00`)) : ""}</span>,
  },
]

function Filter({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string | null) => void }) {
  return (
    <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
      <SelectTrigger className="w-[min(14rem,100%)]" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label} : tous</SelectItem>
        {options.map(([key, text]) => (
          <SelectItem key={key} value={key}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Fiches des experts (UC01, UC02). */
export function ExpertsPage() {
  const { params, query, update } = useListParams(["status", "employment"])
  const experts = useExperts(query)
  const filtered = Boolean(params.q || params.filters.status || params.filters.employment)

  return (
    <Page>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[68ch]">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Experts</h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
            Une fiche par expert, vérifiée par une autre personne que son auteur avant d'entrer dans un dossier.
          </p>
        </div>
        <Button asChild>
          <Link to="/experts/nouveau">
            <UserPlus data-icon="inline-start" aria-hidden="true" />
            Nouvel expert
          </Link>
        </Button>
      </header>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={params.q} onSearch={(q) => update({ q })} label="Rechercher un expert" placeholder="Nom, prénoms, titre…" />
        <Filter
          label="Fiche"
          value={params.filters.status ?? ""}
          options={(Object.keys(RECORD_STATUS_LABEL) as RecordStatus[]).map((key) => [key, RECORD_STATUS_LABEL[key]])}
          onChange={(status) => update({ filters: { status } })}
        />
        <Filter
          label="Statut"
          value={params.filters.employment ?? ""}
          options={(Object.keys(EMPLOYMENT_LABEL) as Employment[]).map((key) => [key, EMPLOYMENT_LABEL[key]])}
          onChange={(employment) => update({ filters: { employment } })}
        />
      </div>
      <DataTable
        caption="Experts"
        columns={COLUMNS}
        rows={experts.data?.results}
        rowKey={(row) => row.id}
        loading={experts.isFetching}
        error={experts.error}
        onRetry={() => void experts.refetch()}
        empty={
          filtered
            ? { title: "Aucun expert ne correspond", hint: "Vérifiez l'orthographe, ou retirez un filtre." }
            : {
                title: "Aucune fiche d'expert pour l'instant",
                hint: "Créez la première fiche, puis rattachez ses valeurs à leurs pièces sources.",
                action: (
                  <Button asChild>
                    <Link to="/experts/nouveau">
                      <UserPlus data-icon="inline-start" aria-hidden="true" />
                      Nouvel expert
                    </Link>
                  </Button>
                ),
              }
        }
      />
      {experts.data ? <Pagination page={params.page} count={experts.data.count} onPage={(page) => update({ page })} /> : null}
    </Page>
  )
}
