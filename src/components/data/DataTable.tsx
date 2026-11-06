import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw, SearchX } from "lucide-react"

import { userMessage } from "@/api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type Column<T> = {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  /** Clé de tri de l'API ; sans elle, la colonne ne se trie pas. */
  sortKey?: string
  align?: "left" | "right"
  /** Montants, jours, pourcentages : chiffres à chasse fixe. */
  numeric?: boolean
  className?: string
}

function SortButton({ label, active, onClick }: { label: string; active: "asc" | "desc" | null; onClick: () => void }) {
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold hover:bg-muted hover:text-ink"
    >
      {label}
      <Icon className={cn("size-3.5", active ? "text-blue-600" : "text-ink-muted/70")} aria-hidden="true" />
    </button>
  )
}

/**
 * Tableau d'une liste servie par l'API : lignes serrées, tri par le serveur, états de
 * chargement, d'erreur et de liste vide.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  error,
  onRetry,
  ordering = "",
  onSort,
  empty,
  onRowClick,
}: {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  /** Décrit le tableau aux lecteurs d'écran. */
  caption: string
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  ordering?: string
  onSort?: (key: string) => void
  empty?: { title: string; hint?: string; action?: React.ReactNode }
  onRowClick?: (row: T) => void
}) {
  const sortState = (key?: string) => (!key ? null : ordering === key ? "asc" : ordering === `-${key}` ? "desc" : null)

  if (error && !rows) {
    return (
      <div role="alert" className="grid place-items-center rounded-xl bg-card px-6 py-12 text-center ring-1 ring-line">
        <p className="text-sm font-bold text-ink">La liste n'a pas pu être chargée</p>
        <p className="mt-1 max-w-[52ch] text-[0.8125rem] text-ink-muted">{userMessage(error)}</p>
        {onRetry ? (
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            <RotateCcw data-icon="inline-start" aria-hidden="true" />
            Réessayer
          </Button>
        ) : null}
      </div>
    )
  }

  if (!loading && rows && rows.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl bg-card px-6 py-14 text-center ring-1 ring-line">
        <SearchX className="size-8 text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-ink">{empty?.title ?? "Aucun résultat"}</p>
        {empty?.hint ? <p className="mt-1 max-w-[52ch] text-[0.8125rem] text-ink-muted">{empty.hint}</p> : null}
        {empty?.action ? <div className="mt-4">{empty.action}</div> : null}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-line" aria-busy={loading || undefined}>
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            {columns.map((column) => {
              const state = sortState(column.sortKey)
              return (
                <TableHead
                  key={column.key}
                  className={cn(column.align === "right" && "text-right", column.className)}
                  aria-sort={state === "asc" ? "ascending" : state === "desc" ? "descending" : undefined}
                >
                  {column.sortKey && onSort ? (
                    <SortButton label={column.header} active={state} onClick={() => onSort(column.sortKey as string)} />
                  ) : (
                    column.header
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && !rows
            ? Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className={cn("h-4", column.align === "right" ? "ml-auto w-16" : "w-28")} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : (rows ?? []).map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn(onRowClick && "cursor-pointer", loading && "opacity-60")}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(column.align === "right" && "text-right", column.numeric && "tabular", column.className)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}
