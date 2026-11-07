import { useQueries, useQuery } from "@tanstack/react-query"
import { ArrowRight, ClipboardCheck } from "lucide-react"
import { Link } from "react-router"

import { api, call, userMessage } from "@/api"
import { ConfidenceTag, type Level } from "@/components/sifec/confidence"
import { Deadline } from "@/components/sifec/deadline"
import { Notice } from "@/components/sifec/notice"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/features/auth"
import { cn } from "@/lib/utils"

const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" })
// Date du jour fixée au chargement de l'écran : l'affichage ne change pas d'un rendu à l'autre.
const TODAY = new Date()

/** Types de fiches à vérifier : ce qu'une autre personne que l'auteur doit publier (UC02). */
const RECORDS: { label: string; base: string; route: string }[] = [
  { label: "Experts", base: "/api/v1/experts/", route: "/experts" },
  { label: "Références", base: "/api/v1/missions/", route: "/references" },
  { label: "Pièces administratives", base: "/api/v1/corporate-documents/", route: "/pieces" },
  { label: "Fiches institutionnelles", base: "/api/v1/institutions/", route: "/institutions" },
  { label: "Dossiers antérieurs", base: "/api/v1/past-dossiers/", route: "/anciens-dossiers" },
  { label: "Méthodologies", base: "/api/v1/methodologies/", route: "/methodologies" },
  { label: "Formulaires types", base: "/api/v1/form-templates/", route: "/formulaires" },
  { label: "Modèles de documents", base: "/api/v1/doc-templates/", route: "/modeles" },
  { label: "Blocs de texte", base: "/api/v1/text-blocks/", route: "/blocs" },
]

type Loose = { GET: (path: string, init: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }> }
const loose = api as unknown as Loose

const LEVEL: Record<string, Level> = { warning: "check", urgent: "check", critical: "block" }
const LEVEL_LABEL: Record<string, string> = { warning: "À prévoir", urgent: "Urgent", critical: "Critique" }
const OBJECT_ROUTE: Record<string, string> = { corporate_document: "/pieces", expert: "/experts", document: "/documents" }

function Panel({ id, title, action, children, className }: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("rounded-xl bg-card ring-1 ring-line", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id={id} className="text-sm font-extrabold text-ink">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Fiches en attente de vérification, par type, chacune ouvrant la liste filtrée. */
function ToVerify() {
  const counts = useQueries({
    queries: RECORDS.map((record) => ({
      queryKey: ["dashboard", "to-verify", record.base],
      queryFn: () => call(loose.GET(record.base, { params: { query: { status: "to_verify" } } })) as Promise<{ count: number }>,
    })),
  })
  const rows = RECORDS.map((record, index) => ({ ...record, count: counts[index].data?.count ?? 0 })).filter((row) => row.count > 0)
  const loading = counts.some((query) => query.isPending)
  return (
    <Panel id="a-verifier" title="Fiches à vérifier">
      {loading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-4 w-[45%]" />
        </div>
      ) : rows.length ? (
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.route}>
              <Link to={`${row.route}?status=to_verify`} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] hover:bg-muted">
                <ClipboardCheck className="size-4 text-blue-600" aria-hidden="true" />
                <span className="flex-1 font-semibold text-ink">{row.label}</span>
                <span className="tabular font-extrabold text-ink">{row.count}</span>
                <ArrowRight className="size-3.5 text-ink-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-[0.8125rem] text-ink-muted">Aucune fiche n'attend de vérification.</p>
      )}
      <p className="border-t border-line px-4 py-2.5 text-xs text-ink-muted">Personne ne publie une fiche qu'il a modifiée : les vôtres attendent une autre personne.</p>
    </Panel>
  )
}

/**
 * Tableau de bord par profil (UC15) : ce qui attend la personne connectée, les alertes, les
 * dossiers en cours. Les chiffres viennent d'agrégats du serveur, filtrés par ses droits.
 */
export function DashboardPage() {
  const session = useSession()
  const overview = useQuery({ queryKey: ["dashboard", "overview"], queryFn: () => call(api.GET("/api/v1/dashboard/")) })
  const name = session.data?.user.first_name
  const data = overview.data

  return (
    <Page>
      <header className="mb-6">
        <p className="text-xs font-semibold text-ink-muted first-letter:uppercase">{day.format(TODAY)}</p>
        <h1 className="mt-1 text-[1.75rem] leading-tight font-extrabold text-ink">{name ? `Bonjour ${name}` : "Tableau de bord"}</h1>
      </header>
      {overview.isError ? (
        <Notice tone="block" title="Tableau de bord indisponible">
          {userMessage(overview.error)}
        </Notice>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <Panel id="validations" title="Validations qui vous attendent">
            {!data ? (
              <Skeleton className="m-4 h-4 w-[50%]" />
            ) : data.validations.length ? (
              <ul className="divide-y divide-line">
                {data.validations.map((item) => (
                  <li key={`${item.bid_id}-${item.step}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[0.8125rem]">
                    <span className="font-semibold text-ink">{item.label}</span>
                    <span className="text-ink-muted">{item.reference}</span>
                    <span className="ml-auto text-xs text-ink-muted">depuis le {shortDay.format(new Date(item.waiting_since))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-[0.8125rem] text-ink-muted">Aucune validation de dossier ne vous attend.</p>
            )}
          </Panel>

          <Panel id="dossiers" title="Dossiers en cours">
            {!data ? (
              <Skeleton className="m-4 h-4 w-[50%]" />
            ) : data.bids.length ? (
              <ul className="divide-y divide-line">
                {data.bids.map((bid) => (
                  <li key={bid.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold text-ink">{bid.title}</span>
                      {bid.deadline && bid.days_left !== null ? (
                        <Deadline date={shortDay.format(new Date(bid.deadline))} daysLeft={bid.days_left} />
                      ) : (
                        <span className="text-xs text-ink-muted">Date limite inconnue</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-muted">
                      <span>{bid.reference}</span>
                      <span className="tabular">
                        Étape {bid.steps_done} sur {bid.steps_total}
                      </span>
                      {bid.current_steps.length ? <span>En cours : {bid.current_steps.join(", ")}</span> : null}
                    </div>
                    {bid.invalidated_reason ? <p className="mt-1 text-xs font-semibold text-check">{bid.invalidated_reason}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-[0.8125rem] text-ink-muted">Aucun dossier en cours.</p>
            )}
          </Panel>

          <ToVerify />
        </div>

        <div className="space-y-5">
          <Panel
            id="alertes"
            title="Alertes ouvertes"
            action={
              <Button asChild size="sm" variant="ghost">
                <Link to="/alertes">Toutes les alertes</Link>
              </Button>
            }
          >
            {!data ? (
              <Skeleton className="m-4 h-4 w-[50%]" />
            ) : data.alerts.length ? (
              <>
                {data.alert_counts.length ? (
                  <dl className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line px-4 py-3">
                    {data.alert_counts.map((item) => (
                      <div key={item.category}>
                        <dt className="text-xs text-ink-muted">{item.label}</dt>
                        <dd className="tabular text-base font-extrabold text-ink">{item.count}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <ul className="divide-y divide-line">
                  {data.alerts.map((alert) => {
                    const route = OBJECT_ROUTE[alert.object_type]
                    const title = <span className="text-[0.8125rem] font-semibold text-ink">{alert.title}</span>
                    return (
                      <li key={alert.id} className="flex items-start gap-2.5 px-4 py-2.5">
                        <ConfidenceTag level={LEVEL[alert.level] ?? "check"}>{LEVEL_LABEL[alert.level] ?? alert.level}</ConfidenceTag>
                        <div className="min-w-0 flex-1">
                          {route ? (
                            <Link to={`${route}/${alert.object_id}`} className="hover:underline">
                              {title}
                            </Link>
                          ) : (
                            title
                          )}
                          {alert.message ? <div className="text-xs text-ink-muted">{alert.message}</div> : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <p className="px-4 py-4 text-[0.8125rem] text-ink-muted">Aucune alerte ouverte. Elles sont recalculées chaque jour à 7 h.</p>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  )
}
