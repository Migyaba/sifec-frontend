import { FileSearch, Upload } from "lucide-react"
import { Link, useParams } from "react-router"

import { ApiError, userMessage } from "@/api"
import { useConfirm } from "@/components/confirm"
import { DataTable, Pagination, useListParams, type Column } from "@/components/data"
import { Notice } from "@/components/sifec/notice"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { formatBytes } from "@/components/upload"
import { KIND_LABEL } from "@/features/documents"
import { cn } from "@/lib/utils"

import { DATE_SOURCE, ITEM_STATUS, useBatch, useBatchAction, useItems, useReport, type Batch, type Item, type ItemStatus } from "../api"
import { BatchStatusBadge } from "../components/BatchStatusBadge"

const number = new Intl.NumberFormat("fr-FR")
const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" })
const kindLabel = (kind: string) => KIND_LABEL[kind as keyof typeof KIND_LABEL] ?? (kind || "Non reconnu")

function Count({ label, value, tone }: { label: string; value: number; tone?: "check" | "block" }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={cn("tabular text-base font-extrabold", tone === "block" && value ? "text-block" : tone === "check" && value ? "text-check" : "text-ink")}>
        {number.format(value)}
      </dd>
    </div>
  )
}

function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  if (!rows.length) return null
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-bold text-ink">{title}</h3>
      <table className="w-full text-[0.8125rem]">
        <tbody className="divide-y divide-line">
          {rows
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => (
              <tr key={label}>
                <td className="py-1 pr-3 text-ink-muted">{label}</td>
                <td className="tabular py-1 text-right font-semibold text-ink">{number.format(value)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

/** Rapport de reprise d'un lot (plan, §5.1) : fichiers traités, rejetés, doublons, scans illisibles, fiches à vérifier. */
function Report({ batch }: { batch: Batch }) {
  const report = useReport(batch.id, batch.status)
  if (report.isPending) return <Skeleton className="h-40 w-full" />
  if (report.isError) return <Notice tone="block" title="Rapport indisponible">{userMessage(report.error)}</Notice>
  const data = report.data
  const read = data.ready + data.duplicates
  const percent = data.files_in_scope ? Math.round((read / data.files_in_scope) * 100) : 0

  return (
    <section aria-labelledby="rapport-title" className="space-y-5 rounded-xl bg-card p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="rapport-title" className="text-base font-extrabold text-ink">
          Rapport de reprise
        </h2>
        <span className="text-xs text-ink-muted">{data.complete ? "Lecture terminée" : "Lecture en cours, le rapport se met à jour"}</span>
      </div>
      {data.files_in_scope ? (
        <div>
          <div className="flex justify-between text-xs text-ink-muted">
            <span>
              {number.format(read)} fichier(s) lu(s) sur {number.format(data.files_in_scope)}
            </span>
            <span className="tabular">{formatBytes(data.size_bytes)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Fichiers lus">
            <div className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out-expo" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : null}
      {data.problems.length ? (
        <details className="rounded-lg bg-check-soft px-4 py-3 text-[0.8125rem] text-[#5c2c07]" open={data.problems.length <= 5}>
          <summary className="cursor-pointer font-bold">{number.format(data.problems.length)} fichier(s) à regarder</summary>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {data.problems.map((entry, index) => (
              <li key={`${String(entry.path)}-${index}`}>
                <span className="break-all font-semibold">{String(entry.path ?? "")}</span> : {String(entry.problem ?? "")}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {data.scan_errors.length ? (
        <Notice tone="block" title="Erreurs de l'inventaire">
          <ul className="list-disc pl-4">
            {data.scan_errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Notice>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        <Count label="Dans le périmètre" value={data.files_in_scope} />
        <Count label="À déposer" value={data.pending} />
        <Count label="En lecture" value={data.processing} />
        <Count label="Prêts" value={data.ready} />
        <Count label="Doublons exacts" value={data.duplicates} />
        <Count label="Quasi-doublons" value={data.near_duplicates} tone="check" />
        <Count label="Lus par OCR" value={data.ocr} />
        <Count label="Illisibles" value={data.illegible} tone="block" />
        <Count label="Lisibilité à vérifier" value={data.to_check} tone="check" />
        <Count label="Écartés" value={data.skipped} />
        <Count label="Refusés" value={data.rejected} tone="block" />
        <Count label="Échecs du dépôt" value={data.failed} tone="block" />
      </dl>
      {data.dossiers_to_verify ? (
        <Notice tone="info" title={`${data.dossiers_to_verify} dossier(s) antérieur(s) à vérifier`} action={<Button asChild size="sm" variant="outline"><Link to={`/anciens-dossiers?batch=${batch.id}&status=draft`}>Les ouvrir</Link></Button>}>
          Désignez pour chacun la version réellement déposée, sa date et son résultat, puis faites-le vérifier.
        </Notice>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <Breakdown title="Par type de pièce reconnu" rows={Object.entries(data.by_kind).map(([kind, count]) => [kindLabel(kind), count])} />
        <Breakdown title="Écartés ou refusés, par raison" rows={Object.entries(data.by_reason)} />
        <Breakdown title="Date d'émission devinée d'après" rows={Object.entries(data.by_date_source).map(([source, count]) => [DATE_SOURCE[source] ?? source, count])} />
      </div>
    </section>
  )
}

const ITEM_COLUMNS: Column<Item>[] = [
  {
    key: "path",
    header: "Fichier",
    wrap: true,
    cell: (row) => {
      const name = row.relative_path.split("/").at(-1)
      return (
        <div className="min-w-0">
          {row.document_id ? (
            <Link to={`/documents/${row.document_id}`} className="font-semibold break-all text-ink hover:text-blue-700 hover:underline">
              {name}
            </Link>
          ) : (
            <span className="font-semibold break-all text-ink">{name}</span>
          )}
          <div className="text-2xs break-all text-ink-muted">{row.relative_path}</div>
        </div>
      )
    },
  },
  { key: "status", header: "État", cell: (row) => <span className={cn(row.status === "failed" || row.status === "rejected" ? "font-semibold text-block" : "text-ink")}>{ITEM_STATUS[row.status]}</span> },
  { key: "reason", header: "Raison", wrap: true, cell: (row) => <span className="text-ink-muted">{row.reason}</span> },
  { key: "kind", header: "Type reconnu", secondary: true, cell: (row) => <span className="text-ink-muted">{kindLabel(row.expected_kind)}</span> },
  {
    key: "date",
    header: "Date devinée",
    secondary: true,
    cell: (row) => (row.issued_on ? <span className="tabular text-ink-muted" title={DATE_SOURCE[row.issued_on_source] ?? ""}>{day.format(new Date(`${row.issued_on}T12:00:00`))}</span> : null),
  },
  { key: "size", header: "Taille", align: "right", numeric: true, secondary: true, cell: (row) => formatBytes(row.size) },
]

function Items({ batch }: { batch: Batch }) {
  const { params, update } = useListParams(["status"])
  const status = params.filters.status ?? ""
  const items = useItems(batch.id, { ...(params.page > 1 ? { page: params.page } : {}), ...(status ? { status } : {}) })
  return (
    <section aria-labelledby="fichiers-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="fichiers-title" className="text-base font-extrabold text-ink">
          Fichiers du lot
        </h2>
        <Select value={status || "tous"} onValueChange={(next) => update({ filters: { status: next === "tous" ? null : next } })}>
          <SelectTrigger className="w-[min(16rem,100%)]" aria-label="État des fichiers">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les états</SelectItem>
            {(Object.keys(ITEM_STATUS) as ItemStatus[]).map((value) => (
              <SelectItem key={value} value={value}>
                {ITEM_STATUS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        caption="Fichiers du lot"
        columns={ITEM_COLUMNS}
        rows={items.data?.results}
        rowKey={(row) => row.id}
        loading={items.isFetching}
        error={items.error}
        onRetry={() => void items.refetch()}
        empty={{ title: status ? "Aucun fichier dans cet état" : "Aucun fichier inventorié", hint: status ? "Choisissez un autre état." : "Lancez l'inventaire du lot." }}
      />
      {items.data ? <Pagination page={params.page} count={items.data.count} onPage={(page) => update({ page })} /> : null}
    </section>
  )
}

function Scope({ batch }: { batch: Batch }) {
  const list = (values: string[], empty: string) => (values.length ? values.join(" ; ") : empty)
  return (
    <dl className="grid gap-x-6 gap-y-3 rounded-xl bg-card p-5 text-[0.8125rem] ring-1 ring-line sm:grid-cols-2">
      <div>
        <dt className="text-xs text-ink-muted">Dossiers inclus</dt>
        <dd className="break-words text-ink">{list(batch.prefixes ?? [], "Tout le dossier existant")}</dd>
      </div>
      <div>
        <dt className="text-xs text-ink-muted">Dossiers exclus</dt>
        <dd className="break-words text-ink">{list(batch.excluded_prefixes ?? [], "Aucun")}</dd>
      </div>
      <div>
        <dt className="text-xs text-ink-muted">Types de pièces</dt>
        <dd className="text-ink">{batch.kinds?.length ? batch.kinds.map(kindLabel).join(", ") : "Tous"}</dd>
      </div>
      <div>
        <dt className="text-xs text-ink-muted">Modifiés depuis le</dt>
        <dd className="text-ink">{batch.modified_since ? day.format(new Date(`${batch.modified_since}T12:00:00`)) : "Sans limite"}</dd>
      </div>
      {batch.dossier_roots?.length ? (
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">Dossiers déposés (un dossier antérieur par sous-dossier)</dt>
          <dd className="break-words text-ink">{batch.dossier_roots.join(" ; ")}</dd>
        </div>
      ) : null}
    </dl>
  )
}

/** Un lot de reprise : son périmètre, l'inventaire, le dépôt, et le rapport. */
export function BatchPage() {
  const { id = "" } = useParams()
  const batch = useBatch(id)
  if (batch.isPending) {
    return (
      <Page>
        <Skeleton className="h-8 w-[40%]" />
        <Skeleton className="mt-6 h-40 w-full" />
      </Page>
    )
  }
  if (batch.isError) {
    return (
      <Page>
        <Notice tone={batch.error instanceof ApiError && batch.error.status === 404 ? "info" : "block"} title="Lot indisponible">
          {userMessage(batch.error)}
        </Notice>
      </Page>
    )
  }
  return <BatchView batch={batch.data} />
}

function BatchView({ batch }: { batch: Batch }) {
  const scan = useBatchAction(batch, "scan")
  const run = useBatchAction(batch, "run")
  const confirm = useConfirm()
  const busy = batch.status === "scanning" || batch.status === "running"
  const error = scan.error ?? run.error

  return (
    <Page>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-xs font-semibold text-ink-muted">
        <Link to="/reprise" className="hover:text-ink hover:underline">
          Reprise de la base
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{batch.name}</span>
      </nav>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-[68ch]">
          <h1 className="text-2xl leading-tight font-extrabold text-ink">{batch.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.8125rem] text-ink-muted">
            <BatchStatusBadge status={batch.status} />
            <span>Ordre de reprise : {batch.priority}</span>
          </div>
          {batch.description ? <p className="mt-2 text-[0.8125rem] text-ink-muted">{batch.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy || scan.isPending} onClick={() => scan.mutate()}>
            <FileSearch data-icon="inline-start" aria-hidden="true" />
            {batch.scanned_at ? "Refaire l'inventaire" : "Inventorier"}
          </Button>
          <Button
            disabled={busy || run.isPending || !batch.scanned_at}
            title={batch.scanned_at ? undefined : "Inventoriez d'abord le lot"}
            onClick={async () => {
              const answer = await confirm({
                title: batch.submitted_at ? "Reprendre le dépôt ?" : "Déposer les fichiers du lot ?",
                description: batch.submitted_at
                  ? "Seuls les fichiers en échec ou pas encore déposés sont repris. Les fichiers déjà dans la base ne sont pas déposés de nouveau."
                  : "Les fichiers inventoriés sont copiés dans la base, puis lus en tâche de fond. Le dossier existant n'est jamais modifié.",
                confirmLabel: batch.submitted_at ? "Reprendre le dépôt" : "Déposer",
              })
              if (answer) run.mutate()
            }}
          >
            <Upload data-icon="inline-start" aria-hidden="true" />
            {batch.submitted_at ? "Reprendre le dépôt" : "Déposer les fichiers"}
          </Button>
        </div>
      </header>
      {error ? (
        <div className="mb-5">
          <Notice tone="block" title="L'action a été refusée">
            {error instanceof ApiError && error.code === "invalid" ? Object.values((error.details as Record<string, string[]>) ?? {}).flat().join(" ") || error.message : userMessage(error)}
          </Notice>
        </div>
      ) : null}
      <div className="space-y-5">
        <Scope batch={batch} />
        <Report batch={batch} />
        <Items batch={batch} />
      </div>
    </Page>
  )
}
