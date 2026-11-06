/** Libellés du backend (schéma OpenAPI) communs à plusieurs types de fiche. */
export const MISSION_NATURE: Record<string, string> = {
  financial_audit: "Audit financier et comptable",
  organizational_audit: "Audit organisationnel ou institutionnel",
  statutory_audit: "Commissariat aux comptes",
  accounting: "Expertise comptable, tenue et révision",
  financial_engineering: "Ingénierie financière",
  evaluation: "Évaluation de projets ou de programmes",
  training: "Formation, renforcement des capacités",
  advisory: "Étude et conseil",
  other: "Autre",
}

export const PROCEDURE: Record<string, string> = {
  ami: "Avis à manifestation d'intérêt",
  ddp: "Demande de propositions",
  dao: "Dossier d'appel d'offres",
  other: "Autre",
}
