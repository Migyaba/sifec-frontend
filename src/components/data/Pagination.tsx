import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export const PAGE_SIZE = 50

const number = new Intl.NumberFormat("fr-FR")

export function rangeLabel(page: number, count: number, pageSize = PAGE_SIZE): string {
  if (count === 0) return "Aucun élément"
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, count)
  return `${number.format(first)} à ${number.format(last)} sur ${number.format(count)}`
}

/** Pagination des listes de l'API : 50 éléments par page. */
export function Pagination({
  page,
  count,
  pageSize = PAGE_SIZE,
  onPage,
}: {
  page: number
  count: number
  pageSize?: number
  onPage: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize))
  return (
    <nav className="flex items-center justify-between gap-3 pt-3" aria-label="Pagination">
      <p className="tabular text-xs text-ink-muted" aria-live="polite">
        {rangeLabel(page, count, pageSize)}
      </p>
      {pages > 1 ? (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft data-icon="inline-start" aria-hidden="true" />
            Précédente
          </Button>
          <span className="tabular px-2 text-xs font-semibold text-ink-muted">
            Page {page} sur {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            Suivante
            <ChevronRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </nav>
  )
}
