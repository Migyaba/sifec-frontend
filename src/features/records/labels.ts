import type { components } from "@/api"
import type { Level } from "@/components/sifec/confidence"

export type RecordStatus = components["schemas"]["RecordStatusEnum"]

export const RECORD_STATUS_LABEL: Record<RecordStatus, string> = {
  draft: "Brouillon",
  to_verify: "À vérifier",
  published: "Publiée",
  archived: "Archivée",
}

/** Niveaux du backend (vert, orange, rouge) traduits dans ceux du système de design. */
export function levelOf(value: string): Level | null {
  if (value === "green") return "ok"
  if (value === "orange") return "check"
  if (value === "red") return "block"
  return null
}

export const MATCH_LABEL: Record<string, string> = {
  exact: "Extrait retrouvé dans la page",
  approximate: "Extrait retrouvé, avec des écarts (OCR)",
  not_found: "Extrait introuvable dans la page",
  none: "Sans extrait",
}

export const EVIDENCE_ORIGIN_LABEL: Record<string, string> = {
  manual: "Rattachée par un collaborateur",
  ai: "Proposée par l'IA",
  import: "Reprise de l'existant",
}
