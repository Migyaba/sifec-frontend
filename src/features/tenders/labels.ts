import type { Level } from "@/components/sifec/confidence"

import type { Category, Requirement, TenderDocumentKind } from "./api"

export const DOCUMENT_KIND: Record<TenderDocumentKind, string> = {
  notice: "Avis, lettre d'invitation",
  instructions: "Instructions aux candidats",
  particular_data: "Données particulières",
  tor: "Termes de référence",
  form: "Formulaires types",
  addendum: "Additif",
  clarification: "Réponse à une demande de clarification",
  other: "Autre",
}

/** Un additif ou une clarification relance l'extraction de la fiche. */
export const AMENDING: TenderDocumentKind[] = ["addendum", "clarification"]

export const CATEGORY: Record<Category, string> = {
  identification: "Identification",
  dates: "Dates",
  submission: "Modalités de dépôt",
  eligibility: "Éligibilité",
  administrative: "Pièces administratives",
  experts: "Postes d'experts",
  forms: "Formulaires types",
  terms: "Termes de référence",
  criteria: "Critères d'évaluation",
  financial: "Offre financière",
  format: "Limites de forme",
}
export const CATEGORIES = Object.keys(CATEGORY) as Category[]

export const READING: Record<string, string> = {
  pending: "En attente de lecture",
  processing: "En lecture",
  ready: "Lu",
  duplicate: "Déjà dans la base",
  failed: "Lecture en échec",
}

export const LANGUAGE: Record<string, string> = { fr: "Français", en: "Anglais", pt: "Portugais" }

/**
 * Confiance d'une exigence : vert si une personne l'a confirmée ; sinon rouge si l'extrait cité
 * est introuvable dans la page, orange si le point est à trancher ou l'extrait approché.
 */
export function confidenceOf(requirement: Requirement): { level: Level; label: string } | null {
  // Une personne a vérifié le point : sa confirmation prime sur la lecture de l'extrait.
  if (requirement.status === "confirmed") return { level: "ok", label: "Confirmé" }
  if (requirement.match === "not_found") return { level: "block", label: "Extrait introuvable" }
  if (requirement.status === "ambiguous") return { level: "check", label: "À trancher" }
  if (requirement.match === "approximate") return { level: "check", label: "Extrait approché" }
  return null
}

// Jours restants comptés depuis le chargement de l'application : l'affichage reste stable.
const NOW = Date.now()

export function daysLeft(deadline: string): number {
  return Math.ceil((Date.parse(deadline) - NOW) / 86_400_000)
}
