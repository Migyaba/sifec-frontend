import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FilePlus2 } from "lucide-react"

import { api, call, userMessage } from "@/api"
import { Button } from "@/components/ui/button"

/** Rôle proposé d'après le type de pièce reconnu à la reprise. */
const ROLE_OF: Record<string, string> = {
  avis: "notice",
  proposition_technique: "technical",
  proposition_financiere: "financial",
}

export const FILE_ROLE: Record<string, string> = {
  notice: "Avis, demande de propositions",
  interest: "Manifestation d'intérêt déposée",
  technical: "Proposition technique déposée",
  financial: "Proposition financière déposée",
  other: "Autre",
}

/**
 * Fichiers repris du dossier d'origine : la personne désigne ceux réellement déposés, en un
 * clic, plutôt que de les rechercher dans toute la base.
 */
export function Candidates({ dossierId, editable }: { dossierId: string; editable: boolean }) {
  const client = useQueryClient()
  const candidates = useQuery({
    queryKey: ["past-dossiers", "candidates", dossierId],
    queryFn: () => call(api.GET("/api/v1/past-dossiers/{id}/candidates/", { params: { path: { id: dossierId } } })),
  })
  const add = useMutation({
    mutationFn: ({ version, role }: { version: string; role: string }) =>
      call(
        api.POST("/api/v1/past-dossiers/{record_pk}/files/", {
          params: { path: { record_pk: dossierId } },
          body: { document_version: version, role: role as never },
        }),
      ),
    onSuccess: () => client.invalidateQueries({ predicate: (query) => query.queryKey.includes(dossierId) }),
  })
  const rows = (candidates.data ?? []).filter((row) => row.document_version)
  if (candidates.isSuccess && !rows.length) return null

  return (
    <section aria-labelledby="candidats-title" className="rounded-xl bg-card ring-1 ring-line">
      <h2 id="candidats-title" className="border-b border-line px-4 py-3 text-sm font-extrabold text-ink">
        Fichiers repris du dossier
      </h2>
      {candidates.isError ? <p className="px-4 py-3 text-xs font-semibold text-block">{userMessage(candidates.error)}</p> : null}
      {add.isError ? <p className="px-4 py-2 text-xs font-semibold text-block">{userMessage(add.error)}</p> : null}
      <ul className="divide-y divide-line">
        {rows.map((row) => {
          const role = ROLE_OF[row.expected_kind] ?? "other"
          return (
            <li key={row.id} className="flex items-start gap-2 px-4 py-2.5 text-[0.8125rem]">
              <div className="min-w-0 flex-1">
                <div className="font-semibold break-all text-ink">{row.relative_path.split("/").at(-1)}</div>
                <div className="text-xs break-all text-ink-muted">{row.relative_path}</div>
              </div>
              {editable ? (
                <Button size="sm" variant="outline" disabled={add.isPending} onClick={() => add.mutate({ version: row.document_version as string, role })}>
                  <FilePlus2 data-icon="inline-start" aria-hidden="true" />
                  {FILE_ROLE[role]}
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
