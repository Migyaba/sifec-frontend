import { useQuery } from "@tanstack/react-query"
import { BriefcaseBusiness, FileText, Loader2, X } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"

import { api, call, userMessage } from "@/api"
import { SearchBox } from "@/components/data"
import { Notice } from "@/components/sifec/notice"
import { Button } from "@/components/ui/button"
import { OrganizationPicker, PROCEDURE } from "@/features/records"

import { useCreateBid } from "../api"
import { problemsOf } from "../messages"

/** Choix de l'avis auquel le dossier répond, par sa référence ou son intitulé. */
function TenderChoice({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [q, setQ] = useState("")
  const found = useQuery({
    queryKey: ["tenders", "list", { q, page: 1 }],
    queryFn: () => call(api.GET("/api/v1/tenders/", { params: { query: { q, page: 1 } } })),
  })
  const rows = found.data?.results ?? []
  const picked = rows.find((row) => row.id === value)
  if (value && picked) {
    return (
      <div className="flex min-h-9 items-center gap-2 rounded-lg border border-input bg-card px-3 py-1.5 text-sm">
        <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="font-semibold">{picked.reference}</span> <span className="text-ink-muted">{picked.title}</span>
        </span>
        <Button type="button" size="icon-xs" variant="ghost" onClick={() => onChange("")} aria-label="Changer d'avis">
          <X aria-hidden="true" />
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      <SearchBox value={q} onSearch={setQ} label="Avis" placeholder="Référence ou intitulé de l'avis…" />
      <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg bg-card ring-1 ring-line" aria-label="Avis : résultats">
        {found.isError ? <li className="px-3 py-2 text-xs text-block">{userMessage(found.error)}</li> : null}
        {rows.map((row) => (
          <li key={row.id}>
            <button type="button" className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-[0.8125rem] hover:bg-muted" onClick={() => onChange(row.id)}>
              <span className="shrink-0 font-semibold text-ink">{row.reference}</span>
              <span className="min-w-0 flex-1 truncate text-ink-muted">{row.title}</span>
              <span className="shrink-0 text-xs text-ink-muted">{PROCEDURE[row.procedure] ?? row.procedure}</span>
            </button>
          </li>
        ))}
        {found.isSuccess && !rows.length ? <li className="px-3 py-2 text-xs text-ink-muted">Aucun avis. Enregistrez d'abord l'avis reçu, dans « Avis ».</li> : null}
      </ul>
    </div>
  )
}

/**
 * Nouveau dossier : l'avis auquel il répond, et l'entité pour le compte de laquelle il est monté
 * (le Cabinet ou un partenaire). La personne qui le crée en devient responsable.
 */
export function NewBidForm({ tenderId, onClose }: { tenderId?: string; onClose: () => void }) {
  const navigate = useNavigate()
  const create = useCreateBid()
  const [tender, setTender] = useState(tenderId ?? "")
  const [entity, setEntity] = useState("")

  return (
    <form
      noValidate
      aria-label="Nouveau dossier"
      className="space-y-4 rounded-xl bg-card p-5 ring-1 ring-line"
      onSubmit={(event) => {
        event.preventDefault()
        if (tender && entity) create.mutate({ tender, lead_entity: entity }, { onSuccess: (bid) => navigate(`/dossiers/${bid.id}`) })
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-ink">Monter un dossier</h2>
          <p className="mt-1 max-w-[68ch] text-xs text-ink-muted">
            Le dossier suit le parcours de la procédure de l'avis. Vous en devenez responsable ; l'équipe s'ajoute ensuite sur sa page.
          </p>
        </div>
        <Button type="button" size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fermer">
          <X aria-hidden="true" />
        </Button>
      </div>
      {create.isError ? (
        <Notice tone="block" title="Dossier non créé">
          {problemsOf(create.error).join(" ")}
        </Notice>
      ) : null}
      <div className="grid gap-x-5 gap-y-4 lg:grid-cols-2">
        {tenderId ? null : (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink">Avis</p>
            <TenderChoice value={tender} onChange={setTender} />
          </div>
        )}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-ink">Pour le compte de</p>
          <OrganizationPicker value={entity} onChange={setEntity} entity label="Entité titulaire" />
          <p className="text-xs text-ink-muted">Le Cabinet, ou le partenaire qui dépose en son nom.</p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={!tender || !entity || create.isPending}>
          {create.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <BriefcaseBusiness data-icon="inline-start" aria-hidden="true" />}
          Créer le dossier
        </Button>
      </div>
    </form>
  )
}
