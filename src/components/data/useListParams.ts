import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"

/**
 * État d'une liste dans l'adresse : page, recherche, tri et filtres. Une liste filtrée se
 * partage par lien et survit au rechargement (plan de l'interface, §4.4).
 */
export type ListParams = {
  page: number
  q: string
  ordering: string
  filters: Record<string, string>
}

const RESERVED = new Set(["page", "q", "ordering"])

export function readListParams(search: URLSearchParams, filterKeys: readonly string[] = []): ListParams {
  const page = Number.parseInt(search.get("page") ?? "1", 10)
  const filters: Record<string, string> = {}
  for (const key of filterKeys) {
    const value = search.get(key)
    if (value && !RESERVED.has(key)) filters[key] = value
  }
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    q: search.get("q") ?? "",
    ordering: search.get("ordering") ?? "",
    filters,
  }
}

/** Paramètres à envoyer à l'API : rien de vide, page 1 omise. */
export function toQuery(params: ListParams): Record<string, string | number> {
  const query: Record<string, string | number> = { ...params.filters }
  if (params.page > 1) query.page = params.page
  if (params.q.trim()) query.q = params.q.trim()
  if (params.ordering) query.ordering = params.ordering
  return query
}

/** Tri suivant d'une colonne : croissant, décroissant, puis aucun. */
export function nextOrdering(current: string, key: string): string {
  if (current === key) return `-${key}`
  if (current === `-${key}`) return ""
  return key
}

export function useListParams(filterKeys: readonly string[] = []) {
  const [search, setSearch] = useSearchParams()
  const keys = filterKeys.join(",")
  const params = useMemo(() => readListParams(search, keys ? keys.split(",") : []), [search, keys])

  const update = useCallback(
    (changes: Partial<Omit<ListParams, "filters">> & { filters?: Record<string, string | null> }) => {
      setSearch(
        (previous) => {
          const next = new URLSearchParams(previous)
          const set = (key: string, value: string | number | null | undefined) => {
            if (value === null || value === undefined || value === "" || (key === "page" && value === 1)) next.delete(key)
            else next.set(key, String(value))
          }
          if ("q" in changes) set("q", changes.q)
          if ("ordering" in changes) set("ordering", changes.ordering)
          for (const [key, value] of Object.entries(changes.filters ?? {})) set(key, value)
          // Changer la recherche, le tri ou un filtre ramène à la première page.
          set("page", "page" in changes ? changes.page : 1)
          return next
        },
        { replace: true },
      )
    },
    [setSearch],
  )

  return { params, query: toQuery(params), update }
}
