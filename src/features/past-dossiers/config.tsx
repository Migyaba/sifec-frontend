import { Link } from "react-router"

import { MISSION_NATURE, OrganizationName, PROCEDURE, statusColumn, type RecordConfig } from "@/features/records"

import { Candidates, FILE_ROLE } from "./Candidates"

const RESULT = { unknown: "Inconnu", retained: "Retenu", not_retained: "Non retenu", not_filed: "Non déposé" }

/** Dossiers déjà déposés : ils servent de témoins pour les nouveaux dossiers (UC03, UC09). */
export const pastDossierConfig: RecordConfig = {
  type: "past_dossier",
  base: "/api/v1/past-dossiers",
  route: "/anciens-dossiers",
  title: "Dossiers antérieurs",
  intro: "Les dossiers déjà déposés par le Cabinet. Validés, ils servent de témoins : un nouveau dossier part du plus proche.",
  newLabel: "Nouveau dossier antérieur",
  newTitle: "Nouveau dossier antérieur",
  searchPlaceholder: "Intitulé, référence de l'avis…",
  empty: { title: "Aucun dossier antérieur", hint: "La reprise de l'existant crée un brouillon par dossier trouvé ; vous pouvez aussi en créer un." },
  name: (row) => String(row.title ?? ""),
  filters: [{ key: "result", label: "Résultat", options: RESULT }],
  linkFilters: [{ key: "batch", label: "Dossiers créés par un lot de reprise." }],
  fields: [
    { name: "title", label: "Intitulé", kind: "text", required: true, wide: true },
    { name: "reference", label: "Référence de l'avis", kind: "text" },
    { name: "entity", label: "Organisation", kind: "organization", entity: true, required: true, createOnly: true },
    { name: "client", label: "Client", kind: "organization", role: "client" },
    { name: "donor", label: "Financement", kind: "organization", role: "donor" },
    { name: "procedure", label: "Procédure", kind: "select", options: PROCEDURE },
    { name: "nature", label: "Type de mission", kind: "select", options: MISSION_NATURE },
    { name: "sector", label: "Secteur", kind: "text" },
    { name: "form_codes", label: "Formulaires utilisés", kind: "tags", help: "Codes des formulaires, séparés par des virgules (TECH-1, FIN-2…)." },
    { name: "filed_on", label: "Déposé le", kind: "date" },
    { name: "result", label: "Résultat", kind: "select", options: RESULT },
    { name: "technical_score", label: "Note technique", kind: "number" },
    { name: "rank", label: "Rang", kind: "number" },
    { name: "result_reason", label: "Motif", kind: "textarea", wide: true },
    { name: "notes", label: "Notes", kind: "textarea", wide: true },
    { name: "source_path", label: "Dossier d'origine", kind: "text", readOnly: true, wide: true },
  ],
  sections: [
    {
      collection: "files",
      title: "Fichiers déposés",
      addLabel: "Ajouter un fichier",
      empty: "Aucun fichier : désignez au moins la version réellement déposée.",
      fields: [
        { name: "role", label: "Rôle du fichier", kind: "select", options: FILE_ROLE, required: true },
        { name: "document_version", label: "Fichier", kind: "document", required: true },
      ],
      summary: (row) => ({ title: String(row.document_title ?? "Fichier"), detail: FILE_ROLE[String(row.role)] }),
    },
  ],
  aside: (row, editable) => <Candidates dossierId={row.id} editable={editable} />,
  columns: [
    {
      key: "title",
      header: "Dossier",
      wrap: true,
      cell: (row) => (
        <Link to={`/anciens-dossiers/${row.id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
          {String(row.title)}
        </Link>
      ),
    },
    { key: "client", header: "Client", secondary: true, cell: (row) => <OrganizationName id={row.client as string} /> },
    { key: "procedure", header: "Procédure", cell: (row) => <span className="text-ink-muted">{String(row.procedure ?? "").toUpperCase()}</span> },
    { key: "filed", header: "Déposé", cell: (row) => <span className="tabular">{String(row.filed_on ?? "")}</span> },
    { key: "result", header: "Résultat", cell: (row) => RESULT[String(row.result) as keyof typeof RESULT] ?? "" },
    statusColumn,
  ],
}
