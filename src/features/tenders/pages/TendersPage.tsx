import { FilePlus2, X } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate } from "react-router"

import { DataTable, Pagination, SearchBox, useListParams, type Column } from "@/components/data"
import { Deadline } from "@/components/sifec/deadline"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PROCEDURE } from "@/features/records"

import { useCreateTender, useTenders, type Tender } from "../api"
import { TenderForm } from "../components/TenderForm"
import { payloadOf, valuesOf } from "../tenderValues"
import { daysLeft } from "../labels"

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" })
const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
const COLUMNS: Column<Tender>[] = [
  {
    key: "title",
    header: "Avis",
    wrap: true,
    cell: (row) => (
      <div className="min-w-[16rem]">
        <Link to={`/avis/${row.id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
          {row.title}
        </Link>
        <div className="text-xs text-ink-muted">{row.reference}</div>
      </div>
    ),
  },
  { key: "procedure", header: "Procédure", cell: (row) => <span className="text-ink-muted">{PROCEDURE[row.procedure] ?? row.procedure}</span> },
  {
    key: "deadline",
    header: "Date limite",
    cell: (row) =>
      row.submission_deadline ? (
        daysLeft(row.submission_deadline) >= 0 ? (
          <Deadline date={shortDay.format(new Date(row.submission_deadline))} daysLeft={daysLeft(row.submission_deadline)} />
        ) : (
          <span className="text-xs text-ink-muted">Passée, le {day.format(new Date(row.submission_deadline))}</span>
        )
      ) : (
        <span className="text-xs text-ink-muted">À lire dans l'avis</span>
      ),
  },
  { key: "created", header: "Enregistré le", secondary: true, cell: (row) => <span className="text-ink-muted">{day.format(new Date(row.created_at))}</span> },
]

/** Avis reçus (UC06) : chacun a ses documents et sa fiche d'exigences. */
export function TendersPage() {
  const navigate = useNavigate()
  const { params, query, update } = useListParams(["procedure"])
  const tenders = useTenders(query)
  const create = useCreateTender()
  const [creating, setCreating] = useState(false)

  return (
    <Page>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[68ch]">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Avis</h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
            Chaque avis reçu est enregistré avec ses documents. Sa fiche d'exigences est extraite des documents, chaque point avec la page qui le dit, puis vérifiée.
          </p>
        </div>
        {creating ? null : (
          <Button onClick={() => setCreating(true)}>
            <FilePlus2 data-icon="inline-start" aria-hidden="true" />
            Nouvel avis
          </Button>
        )}
      </header>
      {creating ? (
        <section aria-labelledby="new-tender" className="mb-6 rounded-xl bg-card p-5 ring-1 ring-line">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="new-tender" className="text-sm font-extrabold text-ink">
                Nouvel avis
              </h2>
              <p className="mt-1 text-xs text-ink-muted">Les documents se déposent ensuite, sur la page de l'avis.</p>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => setCreating(false)} aria-label="Fermer">
              <X aria-hidden="true" />
            </Button>
          </div>
          <TenderForm
            initial={valuesOf()}
            label="Nouvel avis"
            submitLabel="Enregistrer l'avis"
            pending={create.isPending}
            onSubmit={(values, fail) => create.mutate(payloadOf(values), { onSuccess: (tender) => navigate(`/avis/${tender.id}`), onError: fail })}
          />
        </section>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={params.q} onSearch={(q) => update({ q })} label="Rechercher dans les intitulés" placeholder="Rechercher un avis…" />
        <Select value={params.filters.procedure ?? "toutes"} onValueChange={(procedure) => update({ filters: { procedure: procedure === "toutes" ? null : procedure } })}>
          <SelectTrigger className="w-[min(16rem,100%)]" aria-label="Procédure">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes les procédures</SelectItem>
            {Object.entries(PROCEDURE).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        caption="Avis"
        columns={COLUMNS}
        rows={tenders.data?.results}
        rowKey={(row) => row.id}
        loading={tenders.isFetching}
        error={tenders.error}
        onRetry={() => void tenders.refetch()}
        empty={{ title: params.q || params.filters.procedure ? "Aucun avis ne répond à cette recherche" : "Aucun avis", hint: "Enregistrez l'avis reçu, puis déposez ses documents." }}
      />
      {tenders.data ? <Pagination page={params.page} count={tenders.data.count} onPage={(page) => update({ page })} /> : null}
    </Page>
  )
}
