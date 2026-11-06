import type { components } from "@/api"
import type { Level } from "@/components/sifec/confidence"

type S = components["schemas"]
export type DocumentKind = S["DocumentKindEnum"]
export type VersionStatus = S["DocumentVersionStatusEnum"]
export type Legibility = S["LegibilityEnum"]

/** Libellés du backend (schéma OpenAPI), repris tels quels. */
export const KIND_LABEL: Record<DocumentKind, string> = {
  cv: "CV",
  diplome: "Diplôme ou certificat",
  piece_identite: "Pièce d'identité",
  attestation_bonne_fin: "Attestation de bonne fin",
  lettre_mission: "Lettre de mission",
  contrat: "Contrat ou avenant",
  piece_fiscale_sociale: "Pièce fiscale ou sociale",
  piece_juridique: "Pièce juridique (RCCM, statuts, OECCA)",
  etats_financiers: "États financiers",
  tdr: "Termes de référence",
  avis: "Avis (AMI, DDP, DAO)",
  proposition_financiere: "Proposition financière",
  proposition_technique: "Proposition technique",
  chronogramme: "Chronogramme",
  formulaire: "Formulaire type",
  presentation_cabinet: "Présentation du Cabinet",
  autre: "Autre",
}

export const STATUS_LABEL: Record<VersionStatus, string> = {
  pending: "En attente",
  processing: "En cours de traitement",
  ready: "Prêt",
  duplicate: "Doublon exact",
  failed: "Échec",
}

export const KIND_SOURCE_LABEL: Record<S["KindSourceEnum"], string> = {
  rule: "Déduit du nom du fichier",
  manual: "Choisi par un collaborateur",
  ai: "Proposé par l'IA, à confirmer",
}

export const TEXT_SOURCE_LABEL: Record<S["TextSourceEnum"], string> = {
  native: "Texte d'origine",
  ocr: "Reconnu par OCR",
  mixed: "Texte d'origine et OCR",
  none: "Aucun texte",
}

export const ORIGIN_LABEL: Record<S["DocumentOriginEnum"], string> = {
  external: "Pièce externe",
  backfill: "Reprise de l'existant",
  platform_generated: "Produit par la plateforme",
}

/** La lisibilité reprend les niveaux de confiance : un scan peu lisible est à vérifier. */
export const LEGIBILITY: Record<Legibility, { label: string; level: Level | null }> = {
  good: { label: "Lisible", level: "ok" },
  check: { label: "À vérifier", level: "check" },
  poor: { label: "Illisible", level: "block" },
  unknown: { label: "Non mesurée", level: null },
}

export const KINDS = Object.keys(KIND_LABEL) as DocumentKind[]
export const STATUSES = Object.keys(STATUS_LABEL) as VersionStatus[]

export function isProcessing(status: VersionStatus | undefined): boolean {
  return status === "pending" || status === "processing"
}
