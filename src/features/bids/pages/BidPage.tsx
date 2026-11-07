import { ArrowRight } from "lucide-react"
import { Link, useParams } from "react-router"

import { userMessage } from "@/api"
import { hasRole, SUPERVISORS } from "@/app/roles"
import { Deadline } from "@/components/sifec/deadline"
import { Notice } from "@/components/sifec/notice"
import { Page } from "@/components/sifec/page"
import { Pathway } from "@/components/sifec/pathway"
import { Skeleton } from "@/components/ui/skeleton"
import { useAllUsers, useGrants } from "@/features/admin"
import { useSession } from "@/features/auth"
import { PROCEDURE } from "@/features/records"

import { useBid, useMembers, useSteps } from "../api"
import { BidStatusBadge } from "../components/BidStatusBadge"
import { DecisionsPanel } from "../components/DecisionsPanel"
import { GoNoGoPanel } from "../components/GoNoGoPanel"
import { StepActions } from "../components/StepActions"
import { MembersPanel, PartnersPanel } from "../components/TeamPanel"
import { daysLeft, decisionRight, fullName, performer, stepState } from "../labels"

const longDay = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

/**
 * Dossier de réponse (UC08) : son parcours, ce qui est à faire maintenant et par qui, le tableau
 * Go / No-Go, l'équipe et les décisions prises. Le serveur applique le parcours ; l'écran montre
 * ce qu'il permet, et ses refus dans ses mots.
 */
export function BidPage() {
  const { id = "" } = useParams()
  const bid = useBid(id)
  const steps = useSteps(id)
  const members = useMembers(id)
  const users = useAllUsers()
  const session = useSession()
  const user = session.data?.user
  const grants = useGrants(user?.id)

  if (bid.isError) {
    return (
      <Page>
        <Notice tone="block" title="Dossier introuvable">
          {userMessage(bid.error)}
        </Notice>
      </Page>
    )
  }
  if (!bid.data) {
    return (
      <Page>
        <Skeleton className="h-8 w-[40%]" />
        <Skeleton className="mt-4 h-24 w-full" />
      </Page>
    )
  }

  const data = bid.data
  const names = new Map((users.data ?? []).map((person) => [person.id, fullName(person)]))
  const member = Boolean(user && members.data?.some((entry) => entry.user === user.id))
  const open = data.status === "preparing" || data.status === "ready"
  // Droit « bid.edit » du serveur : chefs de pôle et de département, ou collaborateur membre.
  const canEdit = open && (hasRole(user, SUPERVISORS) || (user?.role === "collaborateur" && member))
  const list = steps.data ?? []
  const current = list.filter((step) => step.actionable)
  const reopened = list.filter((step) => step.status === "invalidated" && !step.actionable)
  const requirementsDone = list.some((step) => step.key === "validation_exigences" && step.status === "done")
  const goDone = list.some((step) => step.key === "go_no_go" && step.status === "done")
  const left = data.deadline ? daysLeft(data.deadline) : null

  return (
    <Page>
      <nav aria-label="Fil d'Ariane" className="mb-2 text-xs text-ink-muted">
        <Link to="/dossiers" className="hover:text-blue-700 hover:underline">
          Dossiers
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{data.reference}</span>
      </nav>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[80ch]">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">{data.title}</h1>
          <p className="mt-1 text-[0.9375rem] text-ink-muted">
            {data.reference} · {PROCEDURE[data.procedure] ?? data.procedure} · pour le compte de {data.lead_entity_name}
          </p>
          <Link to={`/avis/${data.tender}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
            Avis et fiche d'exigences
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BidStatusBadge status={data.status} />
          {data.deadline && left !== null ? (
            left >= 0 ? (
              <span title={longDay.format(new Date(data.deadline))}>
                <Deadline date={shortDay.format(new Date(data.deadline))} daysLeft={left} />
              </span>
            ) : (
              <span className="text-xs font-semibold text-ink-muted">Date limite passée</span>
            )
          ) : (
            <span className="text-xs text-ink-muted">Date limite à lire dans l'avis</span>
          )}
        </div>
      </header>

      {data.status === "no_go" ? (
        <Notice tone="block" title="Dossier non poursuivi" className="mb-5">
          {data.closing_reason || "Décision « non » du Go / No-Go."}
        </Notice>
      ) : null}
      {data.status === "ready" ? (
        <Notice tone="info" title="Dossier validé, prêt à déposer" className="mb-5">
          Toutes les étapes sont faites. Une modification de l'avis ou des contenus remettrait les validations concernées à faire.
        </Notice>
      ) : null}

      <section aria-labelledby="parcours" className="mb-5 rounded-xl bg-card ring-1 ring-line">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id="parcours" className="text-sm font-extrabold text-ink">
            Parcours
          </h2>
          {list.length ? (
            <span className="tabular text-xs text-ink-muted">
              {data.steps_done} étape{data.steps_done > 1 ? "s" : ""} faite{data.steps_done > 1 ? "s" : ""} sur {data.steps_total}
            </span>
          ) : null}
        </div>
        <div className="overflow-x-auto px-4 py-5">
          {steps.isError ? (
            <Notice tone="block" title="Parcours indisponible">
              {userMessage(steps.error)}
            </Notice>
          ) : list.length ? (
            <Pathway steps={list.map((step) => ({ key: step.key, label: step.label, by: performer(step), validation: step.kind === "validation", state: stepState(step) }))} />
          ) : (
            <Skeleton className="h-16 w-full" />
          )}
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="space-y-5">
          {open ? (
            <section aria-labelledby="a-faire" className="space-y-3">
              <h2 id="a-faire" className="text-base font-extrabold text-ink">
                À faire maintenant
              </h2>
              {current.map((step) => (
                <StepActions key={step.key} bid={data} step={step} right={decisionRight(user, data.workflow, step, grants.data ?? [])} canEdit={canEdit} syncing={steps.isFetching} />
              ))}
              {steps.isSuccess && !current.length ? <p className="text-[0.8125rem] text-ink-muted">Rien n'attend pour l'instant.</p> : null}
              {reopened.map((step) => (
                <Notice key={step.key} tone="check" title={`« ${step.label} » sera à refaire`}>
                  {step.invalidated_reason}
                </Notice>
              ))}
            </section>
          ) : null}
          <GoNoGoPanel bidId={id} established={requirementsDone || data.status !== "preparing"} editable={canEdit && !goDone} names={names} />
        </div>
        <div className="space-y-5">
          <MembersPanel bidId={id} users={users.data} editable={canEdit} />
          <PartnersPanel bidId={id} leadEntity={data.lead_entity_name} editable={canEdit && data.status === "preparing"} />
          <DecisionsPanel bidId={id} steps={list} names={names} />
        </div>
      </div>
    </Page>
  )
}
