import { Link } from "react-router"

import { ConfidenceTag } from "@/components/sifec/confidence"
import { MISSION_NATURE, OrganizationName, statusColumn, type RecordConfig } from "@/features/records"

const CABINET_ROLE = {
  sole: "Seul titulaire",
  lead: "Chef de file d'un groupement",
  member: "Membre d'un groupement",
  subcontractor: "Sous-traitant",
}

const year = (value: unknown) => (value ? String(value).slice(0, 4) : "")

/** Références : missions réalisées par le Cabinet, citées dans les dossiers (UC01, UC10). */
export const missionConfig: RecordConfig = {
  type: "mission",
  base: "/api/v1/missions",
  route: "/references",
  title: "Références",
  intro: "Les missions réalisées par le Cabinet. Une référence compte dans un dossier avec son attestation de bonne exécution.",
  newLabel: "Nouvelle référence",
  newTitle: "Nouvelle référence",
  searchPlaceholder: "Intitulé, client, secteur…",
  empty: { title: "Aucune référence pour l'instant", hint: "Créez la première fiche, puis rattachez ses valeurs à leurs pièces." },
  name: (row) => String(row.title ?? ""),
  filters: [{ key: "nature", label: "Type de mission", options: MISSION_NATURE }],
  fields: [
    { name: "title", label: "Intitulé de la mission", kind: "text", required: true, wide: true },
    { name: "entity", label: "Organisation titulaire", kind: "organization", entity: true, required: true, createOnly: true },
    { name: "client", label: "Client", kind: "organization", role: "client", required: true },
    { name: "donor", label: "Financement", kind: "organization", role: "donor" },
    { name: "nature", label: "Type de mission", kind: "select", options: MISSION_NATURE, required: true },
    { name: "sector", label: "Secteur", kind: "text" },
    { name: "country", label: "Pays", kind: "text" },
    { name: "start_date", label: "Début", kind: "date", required: true },
    { name: "end_date", label: "Fin (vide si en cours)", kind: "date" },
    { name: "contract_number", label: "Numéro du contrat", kind: "text" },
    { name: "amount", label: "Montant", kind: "number" },
    { name: "currency", label: "Devise", kind: "text", defaultValue: "XOF", help: "XOF pour le franc CFA." },
    { name: "cabinet_role", label: "Rôle du Cabinet", kind: "select", options: CABINET_ROLE },
    { name: "cabinet_share", label: "Part du Cabinet (%)", kind: "number" },
    { name: "description", label: "Prestations réalisées", kind: "textarea", wide: true },
  ],
  prefill: {
    defaults: ["entity"],
    hint: "Choisissez le contrat, l'attestation ou le rapport de la mission : l'IA en tire l'intitulé, le client, les dates et le montant, chaque valeur avec sa page.",
  },
  sections: [
    {
      collection: "certificates",
      title: "Attestations de bonne exécution",
      addLabel: "Ajouter une attestation",
      empty: "Aucune attestation : la référence ne compte qu'avec l'accord du chef de pôle.",
      fields: [
        { name: "issued_on", label: "Délivrée le", kind: "date", required: true },
        { name: "signatory", label: "Signataire", kind: "text" },
        { name: "signatory_title", label: "Fonction du signataire", kind: "text" },
        { name: "assessment", label: "Appréciation", kind: "textarea", wide: true },
      ],
      summary: (row) => ({ title: `Attestation du ${String(row.issued_on ?? "")}`, detail: [row.signatory, row.signatory_title].filter(Boolean).join(", ") }),
    },
  ],
  columns: [
    {
      key: "title",
      header: "Mission",
      wrap: true,
      cell: (row) => (
        <Link to={`/references/${row.id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
          {String(row.title)}
        </Link>
      ),
    },
    { key: "client", header: "Client", wrap: true, cell: (row) => <OrganizationName id={row.client as string} /> },
    { key: "nature", header: "Type", secondary: true, cell: (row) => <span className="text-ink-muted">{MISSION_NATURE[String(row.nature)]}</span> },
    { key: "period", header: "Période", cell: (row) => <span className="tabular">{`${year(row.start_date)} à ${row.end_date ? year(row.end_date) : "aujourd'hui"}`}</span> },
    {
      key: "justified",
      header: "Attestation",
      cell: (row) => (row.justified ? <ConfidenceTag level="ok">Justifiée</ConfidenceTag> : <ConfidenceTag level="check">Sans attestation</ConfidenceTag>),
    },
    statusColumn,
  ],
}
