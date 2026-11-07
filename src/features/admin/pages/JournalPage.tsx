import { X } from "lucide-react"
import { useId } from "react"

import { DataTable, Pagination, useListParams, type Column } from "@/components/data"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useAllUsers, useAuditEntries, type AuditEntry } from "../api"

const when = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

/** Actions les plus cherchées, en clair ; les autres gardent leur code. */
const ACTION_LABEL: Record<string, string> = {
  "account.created": "Compte créé",
  "account.role_changed": "Rôle changé",
  "account.deactivated": "Compte désactivé",
  "account.password_set": "Mot de passe provisoire donné",
  "account.otp_enrolled": "Double authentification activée",
  "account.otp_reset": "Double authentification réinitialisée",
  "account.login_succeeded": "Connexion",
  "account.login_failed": "Connexion refusée",
  "delegation.created": "Délégation donnée",
  "delegation.revoked": "Délégation révoquée",
  "parameter.changed": "Paramètre changé",
  "alert.opened": "Alerte ouverte",
  "alert.treated": "Alerte traitée",
  "alert.resolved": "Alerte résolue",
  "alert.escalated": "Alerte relancée",
  "workflow.step_validated": "Étape validée",
  "document.ingested": "Document lu",
  "document.duplicate_detected": "Doublon détecté",
  "assembly.exported": "Dossier exporté",
  "pricing.rate_set": "Taux du barème fixé",
}

/** Personne ou traitement automatique à l'origine d'une entrée. */
function actorOf(entry: AuditEntry, names: Map<string, string>): string {
  if (entry.actor_id) return names.get(entry.actor_id) ?? "Compte inconnu"
  if (entry.actor_label.startsWith("system")) return "Traitement automatique"
  return entry.actor_label || "Inconnu"
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "vide"
  if (typeof value === "string") return value
  return JSON.stringify(value)
}

/** Changements d'une entrée : « champ : avant → après » quand le format s'y prête. */
function Changes({ changes }: { changes: unknown }) {
  if (!changes || typeof changes !== "object" || !Object.keys(changes).length) return <span className="text-ink-muted">Aucun détail</span>
  return (
    <ul className="space-y-0.5">
      {Object.entries(changes as Record<string, unknown>).map(([field, change]) => (
        <li key={field} className="break-words">
          <span className="font-semibold text-ink">{field}</span>
          <span className="text-ink-muted"> : </span>
          {Array.isArray(change) && change.length === 2 ? (
            <>
              <span className="text-ink-muted">{show(change[0])}</span>
              <span aria-label="devient"> → </span>
              <span className="text-ink">{show(change[1])}</span>
            </>
          ) : (
            <span className="text-ink">{show(change)}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * Journal des actions (UC16, synthèse M11) : qui a fait quoi, quand, sur quel objet. En lecture
 * seule, comme la table elle-même ; consulté par le chef de département et l'administrateur.
 */
export function JournalPage() {
  const id = useId()
  const { params, query, update } = useListParams(["actor", "action", "object_id", "from", "to"])
  const entries = useAuditEntries(query)
  const users = useAllUsers()
  const names = new Map((users.data ?? []).map((user) => [user.id, user.full_name || user.email]))
  const filters = params.filters
  const filtered = Object.values(filters).some(Boolean)

  const columns: Column<AuditEntry>[] = [
    {
      key: "when",
      header: "Date",
      cell: (row) => <span className="tabular whitespace-nowrap text-ink-muted">{when.format(new Date(row.recorded_at))}</span>,
    },
    {
      key: "actor",
      header: "Par",
      cell: (row) => <span className="font-semibold text-ink">{actorOf(row, names)}</span>,
    },
    {
      key: "action",
      header: "Action",
      cell: (row) => (
        <div>
          <div className="text-ink">{ACTION_LABEL[row.action] ?? row.action}</div>
          {ACTION_LABEL[row.action] ? <div className="font-mono text-[0.6875rem] text-ink-muted">{row.action}</div> : null}
        </div>
      ),
    },
    {
      key: "object",
      header: "Objet",
      secondary: true,
      cell: (row) => (
        <button
          type="button"
          className="text-left font-mono text-[0.6875rem] text-ink-muted hover:text-blue-700 hover:underline"
          title="Voir toutes les entrées de cet objet"
          onClick={() => update({ filters: { object_id: row.object_id } })}
        >
          <div>{row.object_type}</div>
          <div>{row.object_id.slice(0, 8)}</div>
        </button>
      ),
    },
    {
      key: "changes",
      header: "Changements",
      wrap: true,
      cell: (row) => (
        <div className="max-w-[40ch] min-w-[14rem] text-xs">
          <Changes changes={row.changes} />
        </div>
      ),
    },
  ]

  return (
    <Page>
      <header className="mb-6 max-w-[68ch]">
        <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Journal des actions</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-muted">Chaque action qui compte y est inscrite : connexion, changement de rôle, validation, export, paramètre. Personne ne peut le modifier.</p>
      </header>
      <form role="search" aria-label="Filtrer le journal" className="mb-3 flex flex-wrap items-end gap-3" onSubmit={(event) => event.preventDefault()}>
        <div className="w-[min(16rem,100%)] space-y-1">
          <Label htmlFor={`${id}-actor`} className="text-xs">
            Personne
          </Label>
          <Select value={filters.actor ?? "tous"} onValueChange={(actor) => update({ filters: { actor: actor === "tous" ? null : actor } })}>
            <SelectTrigger id={`${id}-actor`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tout le monde</SelectItem>
              {(users.data ?? []).map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[min(16rem,100%)] space-y-1">
          <Label htmlFor={`${id}-action`} className="text-xs">
            Action
          </Label>
          <Select
            value={filters.action ?? "toutes"}
            onValueChange={(action) =>
              update({
                filters: { action: action === "toutes" ? null : action },
              })
            }
          >
            <SelectTrigger id={`${id}-action`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les actions</SelectItem>
              {Object.entries(ACTION_LABEL).map(([code, label]) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
              {filters.action && !ACTION_LABEL[filters.action] ? <SelectItem value={filters.action}>{filters.action}</SelectItem> : null}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-from`} className="text-xs">
            Du
          </Label>
          <Input id={`${id}-from`} type="date" value={filters.from ?? ""} onChange={(event) => update({ filters: { from: event.target.value || null } })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-to`} className="text-xs">
            Au
          </Label>
          <Input id={`${id}-to`} type="date" value={filters.to ?? ""} onChange={(event) => update({ filters: { to: event.target.value || null } })} />
        </div>
        {filters.object_id ? (
          <p className="pb-2 text-xs text-ink">
            Objet <span className="font-mono">{filters.object_id.slice(0, 8)}</span>
          </p>
        ) : null}
        {filtered ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-0.5"
            onClick={() =>
              update({
                filters: {
                  actor: null,
                  action: null,
                  object_id: null,
                  from: null,
                  to: null,
                },
              })
            }
          >
            <X data-icon="inline-start" aria-hidden="true" />
            Effacer les filtres
          </Button>
        ) : null}
      </form>
      <DataTable
        caption="Journal des actions"
        columns={columns}
        rows={entries.data?.results}
        rowKey={(row) => String(row.id)}
        loading={entries.isFetching}
        error={entries.error}
        onRetry={() => void entries.refetch()}
        empty={{
          title: "Aucune entrée",
          hint: filtered ? "Aucune entrée ne répond à ces filtres." : "Le journal se remplit à la première action.",
        }}
      />
      {entries.data ? <Pagination page={params.page} count={entries.data.count} onPage={(page) => update({ page })} /> : null}
    </Page>
  )
}
