import type { ItemSection } from "@/features/records"

/** Libellés repris du schéma de l'API (titres des champs du backend). */
const LANGUAGE_LEVEL = { excellent: "Excellent", good: "Bon", fair: "Moyen", poor: "Faible" }
const DEGREE_LEVEL = {
  baccalaureat: "Baccalauréat",
  bac_2: "Bac + 2 (BTS, DUT)",
  licence: "Licence, bachelor",
  master: "Master, maîtrise, DESS",
  doctorat: "Doctorat",
  professional: "Diplôme professionnel (DEC, DSCG…)",
  other: "Autre",
}
const PRECISION = { day: "Jour", month: "Mois", year: "Année" }

const year = (value: unknown) => (value ? String(value).slice(0, 4) : "")
const span = (start: unknown, end: unknown) => `${year(start)} à ${end ? year(end) : "aujourd'hui"}`

export const EXPERT_SECTIONS: ItemSection[] = [
  {
    collection: "experiences",
    title: "Expériences",
    addLabel: "Ajouter une expérience",
    empty: "Aucune expérience. Chaque expérience compte dans les années d'expérience et dans les références.",
    fields: [
      { name: "role", label: "Poste occupé", kind: "text", required: true },
      { name: "employer", label: "Employeur ou client", kind: "text", required: true },
      { name: "project", label: "Projet ou mission", kind: "text", wide: true },
      { name: "start_date", label: "Début", kind: "date", required: true },
      { name: "end_date", label: "Fin (vide si en cours)", kind: "date" },
      { name: "date_precision", label: "Précision des dates", kind: "select", options: PRECISION, help: "Une date connue au mois seulement compte au mois." },
      { name: "country", label: "Pays", kind: "text" },
      { name: "donor", label: "Financement", kind: "text" },
      { name: "sector", label: "Secteur", kind: "text" },
      { name: "description", label: "Activités", kind: "textarea", wide: true },
    ],
    summary: (row) => ({
      title: `${row.role ?? ""}, ${row.employer ?? ""}`,
      detail: [span(row.start_date, row.end_date), row.project, row.country].filter(Boolean).join(" · "),
    }),
  },
  {
    collection: "degrees",
    title: "Diplômes",
    addLabel: "Ajouter un diplôme",
    empty: "Aucun diplôme.",
    fields: [
      { name: "title", label: "Intitulé", kind: "text", required: true, wide: true },
      { name: "level", label: "Niveau", kind: "select", options: DEGREE_LEVEL },
      { name: "field_of_study", label: "Spécialité", kind: "text" },
      { name: "institution", label: "Établissement", kind: "text", required: true },
      { name: "country", label: "Pays", kind: "text" },
      { name: "obtained_year", label: "Année d'obtention", kind: "year", required: true },
    ],
    summary: (row) => ({ title: String(row.title ?? ""), detail: [row.institution, row.obtained_year].filter(Boolean).join(" · ") }),
  },
  {
    collection: "certifications",
    title: "Certifications",
    addLabel: "Ajouter une certification",
    empty: "Aucune certification.",
    fields: [
      { name: "name", label: "Intitulé", kind: "text", required: true, wide: true },
      { name: "issuer", label: "Organisme", kind: "text" },
      { name: "obtained_on", label: "Date d'obtention", kind: "date" },
      { name: "expires_on", label: "Date d'expiration", kind: "date", help: "Une certification expirée passe en rouge." },
    ],
    summary: (row) => ({ title: String(row.name ?? ""), detail: [row.issuer, row.expires_on ? `expire le ${row.expires_on}` : ""].filter(Boolean).join(" · ") }),
  },
  {
    collection: "languages",
    title: "Langues",
    addLabel: "Ajouter une langue",
    empty: "Aucune langue.",
    fields: [
      { name: "language", label: "Langue", kind: "text", required: true },
      { name: "mother_tongue", label: "Langue maternelle", kind: "boolean" },
      { name: "speaking", label: "Parler", kind: "select", options: LANGUAGE_LEVEL, required: true },
      { name: "reading", label: "Lire", kind: "select", options: LANGUAGE_LEVEL, required: true },
      { name: "writing", label: "Écrire", kind: "select", options: LANGUAGE_LEVEL, required: true },
    ],
    summary: (row) => ({
      title: String(row.language ?? ""),
      detail: row.mother_tongue
        ? "Langue maternelle"
        : `Parler ${LANGUAGE_LEVEL[row.speaking as keyof typeof LANGUAGE_LEVEL] ?? ""}, lire ${LANGUAGE_LEVEL[row.reading as keyof typeof LANGUAGE_LEVEL] ?? ""}, écrire ${LANGUAGE_LEVEL[row.writing as keyof typeof LANGUAGE_LEVEL] ?? ""}`.toLowerCase(),
    }),
  },
  {
    collection: "memberships",
    title: "Ordres et associations",
    addLabel: "Ajouter une inscription",
    empty: "Aucune inscription à un ordre ou à une association.",
    fields: [
      { name: "body", label: "Ordre ou association", kind: "text", required: true, wide: true },
      { name: "membership_number", label: "Numéro d'inscription", kind: "text" },
      { name: "since", label: "Inscrit depuis", kind: "date" },
      { name: "valid_until", label: "Valable jusqu'au", kind: "date" },
    ],
    summary: (row) => ({ title: String(row.body ?? ""), detail: row.membership_number ? `n° ${row.membership_number}` : undefined }),
  },
]
