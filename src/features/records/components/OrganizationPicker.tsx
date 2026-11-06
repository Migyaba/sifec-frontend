import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Plus, X } from "lucide-react"
import { useEffect, useState } from "react"

import { api, call, userMessage, type components } from "@/api"
import { SearchBox } from "@/components/data"
import { Button } from "@/components/ui/button"

export type OrganizationRole = components["schemas"]["RolesEnum"]

/** Nom d'une organisation à partir de son identifiant : les fiches ne donnent que l'identifiant. */
export function useOrganization(id: string | undefined) {
  return useQuery({
    queryKey: ["organizations", "one", id],
    queryFn: () => call(api.GET("/api/v1/organizations/{id}/", { params: { path: { id: id as string } } })),
    enabled: Boolean(id),
    staleTime: 10 * 60_000,
  })
}

/**
 * Choix d'une organisation (client, bailleur, entité du Cabinet), avec recherche. Une
 * organisation absente se crée sur place, avec le seul rôle demandé : le reste se complète dans
 * sa fiche.
 */
export function OrganizationPicker({
  value,
  onChange,
  role,
  entity = false,
  label,
  disabled = false,
}: {
  value: string
  onChange: (id: string) => void
  role?: OrganizationRole
  entity?: boolean
  label: string
  disabled?: boolean
}) {
  const client = useQueryClient()
  const [q, setQ] = useState("")
  const picked = useOrganization(value || undefined)
  const results = useQuery({
    queryKey: ["organizations", "picker", role, entity, q],
    queryFn: () => call(api.GET("/api/v1/organizations/", { params: { query: { q, ...(role ? { role } : {}), ...(entity ? { entity } : {}) } } })),
    enabled: !value && (entity || q.trim().length >= 2),
  })
  const create = useMutation({
    mutationFn: (name: string) => call(api.POST("/api/v1/organizations/", { body: { name, roles: role ? [role] : [] } })),
    onSuccess: (organization) => {
      void client.invalidateQueries({ queryKey: ["organizations"] })
      onChange(organization.id)
      setQ("")
    },
  })

  const rows = results.data?.results ?? []
  // Une seule entité possible (le Cabinet seul) : elle est choisie d'office.
  const only = entity && results.isSuccess && rows.length === 1 ? rows[0].id : null
  useEffect(() => {
    if (only && !disabled) onChange(only)
  }, [only, disabled, onChange])

  if (value) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm">
        <Building2 className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{picked.data?.name ?? "…"}</span>
        {disabled ? null : (
          <Button type="button" size="icon-xs" variant="ghost" onClick={() => onChange("")} aria-label={`Changer ${label.toLowerCase()}`}>
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
    )
  }
  const exact = rows.some((row) => row.name.toLowerCase() === q.trim().toLowerCase())
  return (
    <div className="space-y-1.5">
      <SearchBox value={q} onSearch={setQ} label={label} placeholder="Nom de l'organisation…" />
      {entity || q.trim().length >= 2 ? (
        <ul className="max-h-48 divide-y divide-line overflow-y-auto rounded-lg bg-card ring-1 ring-line" aria-label={`${label} : résultats`}>
          {results.isError ? <li className="px-3 py-2 text-xs text-block">{userMessage(results.error)}</li> : null}
          {rows.map((row) => (
            <li key={row.id}>
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] hover:bg-muted" onClick={() => onChange(row.id)}>
                <Building2 className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                {row.acronym ? <span className="text-xs text-ink-muted">{row.acronym}</span> : null}
              </button>
            </li>
          ))}
          {q.trim().length >= 2 && !exact && !entity ? (
            <li>
              <button
                type="button"
                disabled={create.isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] font-semibold text-blue-700 hover:bg-blue-50"
                onClick={() => create.mutate(q.trim())}
              >
                <Plus className="size-4 shrink-0" aria-hidden="true" />
                Créer « {q.trim()} »
              </button>
            </li>
          ) : null}
          {results.isSuccess && !rows.length && entity ? <li className="px-3 py-2 text-xs text-ink-muted">Aucune organisation.</li> : null}
        </ul>
      ) : null}
      {create.isError ? <p className="text-xs font-semibold text-block">{userMessage(create.error)}</p> : null}
    </div>
  )
}

/** Nom d'une organisation, pour une cellule de tableau. */
export function OrganizationName({ id }: { id: string | null | undefined }) {
  const organization = useOrganization(id ?? undefined)
  if (!id) return null
  return <span>{organization.data?.name ?? "…"}</span>
}
