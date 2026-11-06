import { Link } from "react-router"

import { statusColumn, type RecordConfig } from "@/features/records"

import { EMPLOYMENT_LABEL } from "./api"
import { Consents } from "./components/Consents"
import { ExpertSummaryBar } from "./components/ExpertSummaryBar"
import { EXPERT_SECTIONS } from "./sections"

const short = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" })

/** Experts du Cabinet et de ses partenaires (UC01, UC02, UC05). */
export const expertConfig: RecordConfig = {
  type: "expert",
  base: "/api/v1/experts",
  route: "/experts",
  title: "Experts",
  intro: "Une fiche par expert, vérifiée par une autre personne que son auteur avant d'entrer dans un dossier.",
  newLabel: "Nouvel expert",
  newTitle: "Nouvel expert",
  searchPlaceholder: "Nom, prénoms, titre…",
  empty: { title: "Aucune fiche d'expert pour l'instant", hint: "Créez la première fiche, puis rattachez ses valeurs à leurs pièces sources." },
  name: (row) => `${String(row.last_name ?? "")} ${String(row.first_name ?? "")}`.trim(),
  filters: [{ key: "employment", label: "Statut", options: EMPLOYMENT_LABEL }],
  fields: [
    { name: "last_name", label: "Nom", kind: "text", required: true },
    { name: "first_name", label: "Prénoms", kind: "text", required: true },
    { name: "entity", label: "Organisation", kind: "organization", entity: true, required: true, createOnly: true },
    { name: "employment", label: "Statut", kind: "select", options: EMPLOYMENT_LABEL, required: true },
    { name: "title", label: "Titre ou profession", kind: "text", wide: true },
    { name: "birth_date", label: "Date de naissance", kind: "date", help: "Pièce source exigée." },
    { name: "nationality", label: "Nationalité", kind: "text", help: "Pièce source exigée." },
    { name: "email", label: "Courriel", kind: "text" },
    { name: "phone", label: "Téléphone", kind: "text" },
    { name: "cv_date", label: "Date du CV", kind: "date", help: "Pièce source exigée. Au-delà de 12 mois, le CV est à faire confirmer." },
    { name: "summary", label: "Profil", kind: "textarea", wide: true },
  ],
  sections: EXPERT_SECTIONS,
  prefill: {
    defaults: ["entity", "employment"],
    hint: "Choisissez le CV de l'expert dans les documents : l'IA en tire l'identité, les expériences, les diplômes et les langues, chaque valeur avec sa page.",
  },
  top: (row) => <ExpertSummaryBar expertId={row.id} />,
  aside: (row, editable) => <Consents expertId={row.id} editable={editable} />,
  columns: [
    {
      key: "name",
      header: "Expert",
      wrap: true,
      cell: (row) => (
        <Link to={`/experts/${row.id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
          {String(row.last_name)} {String(row.first_name)}
        </Link>
      ),
    },
    { key: "title", header: "Titre ou profession", wrap: true, cell: (row) => <span className="text-ink-muted">{String(row.title ?? "")}</span> },
    { key: "employment", header: "Statut", cell: (row) => EMPLOYMENT_LABEL[row.employment as keyof typeof EMPLOYMENT_LABEL] },
    statusColumn,
    {
      key: "cv",
      header: "Date du CV",
      secondary: true,
      cell: (row) => <span className="text-ink-muted">{row.cv_date ? short.format(new Date(`${String(row.cv_date)}T12:00:00`)) : ""}</span>,
    },
  ],
}
