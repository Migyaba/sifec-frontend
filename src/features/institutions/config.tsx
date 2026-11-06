import { Link } from "react-router"

import { OrganizationName, statusColumn, type RecordConfig } from "@/features/records"

/** Fiche institutionnelle du Cabinet et de ses partenaires : identité, RCCM, IFU, présentation. */
export const institutionConfig: RecordConfig = {
  type: "institution",
  base: "/api/v1/institutions",
  route: "/institutions",
  title: "Fiches institutionnelles",
  intro: "L'identité du Cabinet et de ses partenaires de groupement, telle qu'elle entre dans les dossiers.",
  newLabel: "Nouvelle fiche",
  newTitle: "Nouvelle fiche institutionnelle",
  searchPlaceholder: "Raison sociale…",
  empty: { title: "Aucune fiche institutionnelle", hint: "Commencez par celle du Cabinet : chaque dossier la reprend." },
  name: (row) => String(row.legal_name ?? ""),
  prefill: {
    defaults: ["organization"],
    hint: "Choisissez les statuts, le RCCM ou une présentation du Cabinet : l'IA en tire la raison sociale, les numéros et le siège, chaque valeur avec sa page.",
  },
  fields: [
    { name: "organization", label: "Organisation", kind: "organization", entity: true, required: true, createOnly: true },
    { name: "legal_name", label: "Raison sociale", kind: "text", required: true },
    { name: "legal_form", label: "Forme juridique", kind: "text" },
    { name: "founded_on", label: "Date de création", kind: "date" },
    { name: "registration_number", label: "Numéro RCCM", kind: "text" },
    { name: "tax_id", label: "IFU", kind: "text" },
    { name: "headcount", label: "Effectif", kind: "number" },
    { name: "address", label: "Siège", kind: "text", wide: true },
    { name: "presentation", label: "Présentation", kind: "textarea", wide: true },
  ],
  columns: [
    {
      key: "name",
      header: "Raison sociale",
      wrap: true,
      cell: (row) => (
        <Link to={`/institutions/${row.id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
          {String(row.legal_name)}
        </Link>
      ),
    },
    { key: "organization", header: "Organisation", cell: (row) => <OrganizationName id={row.organization as string} /> },
    { key: "rccm", header: "RCCM", secondary: true, cell: (row) => <span className="tabular text-ink-muted">{String(row.registration_number ?? "")}</span> },
    { key: "ifu", header: "IFU", secondary: true, cell: (row) => <span className="tabular text-ink-muted">{String(row.tax_id ?? "")}</span> },
    statusColumn,
  ],
}
