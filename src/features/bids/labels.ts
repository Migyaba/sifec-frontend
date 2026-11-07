import type { Level } from "@/components/sifec/confidence"
import type { StepState } from "@/components/sifec/pathway"
import type { Role, SessionUser } from "@/app/roles"

import type { BidStatus, CriterionResult, MemberRole, PartnerRole, Step } from "./api"

export const BID_STATUS: Record<BidStatus, string> = {
  preparing: "En préparation",
  no_go: "Non poursuivi",
  ready: "Validé, prêt à déposer",
  filed: "Déposé",
  result_known: "Résultat connu",
  closed: "Clôturé",
}

export const MEMBER_ROLE: Record<MemberRole, string> = { responsible: "Responsable du dossier", contributor: "Contributeur" }
export const PARTNER_ROLE: Record<PartnerRole, string> = { member: "Membre du groupement", subcontractor: "Sous-traitant" }

export const CRITERION: Record<CriterionResult, { label: string; level: Level }> = {
  met: { label: "Satisfait", level: "ok" },
  not_met: { label: "Non satisfait", level: "block" },
  to_check: { label: "À vérifier", level: "check" },
}

/** Étapes que la plateforme termine d'elle-même : dépôt, extraction, contrôle de conformité. */
export const AUTOMATIC = ["depot", "extraction", "controle_conformite"]

/** Qui fait l'étape, en clair : un rôle pour une validation, l'équipe ou la plateforme sinon. */
export function performer(step: Step): string {
  if (step.kind !== "validation") return AUTOMATIC.includes(step.key) ? "Plateforme" : "Équipe du dossier"
  return step.roles.includes("chef_pole") ? "Chef de pôle" : "Chef de département"
}

export function stepState(step: Step): StepState {
  if (step.status === "done") return "done"
  if (step.status === "invalidated") return "reopened"
  return step.actionable ? "current" : "todo"
}

/** Portée de délégation écrite qui permet cette validation (`workflow.ami.go_no_go`). */
export const delegationScope = (workflow: string, step: string) => `workflow.${workflow}.${step}`

/** Le rôle prévu par le parcours, ou une délégation écrite en vigueur. Le serveur reste juge. */
export function decisionRight(user: Pick<SessionUser, "role"> | undefined, workflow: string, step: Step, grants: readonly string[]): "role" | "delegation" | null {
  if (!user) return null
  if (step.roles.includes(user.role as Role)) return "role"
  return grants.includes(delegationScope(workflow, step.key)) ? "delegation" : null
}

/** Jours restants avant une date, comptés en jours civils. */
export function daysLeft(iso: string, today = new Date()): number {
  const target = new Date(iso)
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const end = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((end - start) / 86_400_000)
}

export const fullName = (user: Pick<SessionUser, "first_name" | "last_name" | "email">) => [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
