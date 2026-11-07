import { BriefcaseBusiness } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

import { DataTable, Pagination, SearchBox, useListParams, type Column } from "@/components/data"
import { Deadline } from "@/components/sifec/deadline"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PROCEDURE } from "@/features/records"

import { useBids, type Bid, type BidStatus } from "../api"
import { BidStatusBadge } from "../components/BidStatusBadge"
import { NewBidForm } from "../components/NewBidForm"
import { BID_STATUS, daysLeft } from "../labels"

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" })
const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

const COLUMNS: Column<Bid>[] = [
  {
    key: "title",
    header: "Dossier",
    wrap: true,
    cell: (row) => (
      <div className="min-w-[16rem]">
        <Link to={`/dossiers/${row.id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
          {row.title}
        </Link>
        <div className="text-xs text-ink-muted">
          {row.reference} · {PROCEDURE[row.procedure] ?? row.procedure}
        </div>
      </div>
    ),
  },
  { key: "entity", header: "Pour le compte de", wrap: true, cell: (row) => <span className="text-ink">{row.lead_entity_name}</span> },
  { key: "status", header: "État", cell: (row) => <BidStatusBadge status={row.status} /> },
  {
    key: "progress",
    header: "Avancement",
    wrap: true,
    cell: (row) => (
      <div className="min-w-[12rem]">
        <div className="tabular text-[0.8125rem] font-semibold text-ink">
          {row.steps_done} sur {row.steps_total}
        </div>
        {row.status === "preparing" && row.current_steps.length ? <div className="text-xs text-ink-muted">{row.current_steps.join(", ")}</div> : null}
      </div>
    ),
  },
  {
    key: "deadline",
    header: "Date limite",
    cell: (row) =>
      row.deadline ? (
        daysLeft(row.deadline) >= 0 ? (
          <Deadline date={shortDay.format(new Date(row.deadline))} daysLeft={daysLeft(row.deadline)} />
        ) : (
          <span className="text-xs text-ink-muted">Passée, le {day.format(new Date(row.deadline))}</span>
        )
      ) : (
        <span className="text-xs text-ink-muted">À lire dans l'avis</span>
      ),
  },
]

/** Dossiers de réponse (UC08) : chacun suit le parcours de sa procédure, de l'avis au dépôt. */
export function BidsPage() {
  const { params, query, update } = useListParams(["status"])
  const bids = useBids(query)
  const [creating, setCreating] = useState(false)
  const filtered = Boolean(params.q || params.filters.status)

  return (
    <Page>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[68ch]">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Dossiers</h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
            Un dossier répond à un avis, pour le compte du Cabinet ou d'un partenaire. Il avance étape par étape ; chaque validation est faite par la bonne personne et figée.
          </p>
        </div>
        {creating ? null : (
          <Button onClick={() => setCreating(true)}>
            <BriefcaseBusiness data-icon="inline-start" aria-hidden="true" />
            Monter un dossier
          </Button>
        )}
      </header>
      {creating ? (
        <div className="mb-6">
          <NewBidForm onClose={() => setCreating(false)} />
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={params.q} onSearch={(q) => update({ q })} label="Rechercher dans les références et les intitulés" placeholder="Rechercher un dossier…" />
        <Select value={params.filters.status ?? "tous"} onValueChange={(status) => update({ filters: { status: status === "tous" ? null : status } })}>
          <SelectTrigger className="w-[min(16rem,100%)]" aria-label="État du dossier">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les états</SelectItem>
            {(Object.keys(BID_STATUS) as BidStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {BID_STATUS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        caption="Dossiers"
        columns={COLUMNS}
        rows={bids.data?.results}
        rowKey={(row) => row.id}
        loading={bids.isFetching}
        error={bids.error}
        onRetry={() => void bids.refetch()}
        empty={{
          title: filtered ? "Aucun dossier ne répond à cette recherche" : "Aucun dossier",
          hint: filtered ? "Changez la recherche ou l'état." : "Montez un dossier à partir d'un avis enregistré. Un collaborateur ne voit que les dossiers dont il est membre.",
        }}
      />
      {bids.data ? <Pagination page={params.page} count={bids.data.count} onPage={(page) => update({ page })} /> : null}
    </Page>
  )
}
