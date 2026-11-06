import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { api, call } from "@/api"
import { ConfidenceTag } from "@/components/sifec/confidence"
import { OrganizationName, statusColumn, type RecordConfig } from "@/features/records"

/** Types de pièces administratives (RCCM, attestation fiscale…), paramétrés par le Cabinet. */
function useDocumentTypes() {
  return useQuery({
    queryKey: ["corporate-document-types"],
    queryFn: () => call(api.GET("/api/v1/corporate-document-types/")),
    staleTime: 10 * 60_000,
  })
}

function useTypeOptions(): Record<string, Record<string, string>> {
  const types = useDocumentTypes()
  const options = Object.fromEntries((types.data ?? []).filter((type) => type.active).map((type) => [type.id, type.name]))
  return { doc_type: options }
}

function TypeName({ id }: { id: unknown }) {
  const types = useDocumentTypes()
  return <span>{types.data?.find((type) => type.id === id)?.name ?? "…"}</span>
}

const short = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" })
// Date du jour fixée au chargement de l'écran : l'affichage ne change pas d'un rendu à l'autre.
const TODAY = Date.now()

/** Validité à aujourd'hui : expirée en rouge, moins de 30 jours en orange. */
function Validity({ expiry }: { expiry: unknown }) {
  if (!expiry) return <span className="text-xs text-ink-muted">Sans échéance</span>
  const date = new Date(`${String(expiry)}T12:00:00`)
  const days = Math.ceil((date.getTime() - TODAY) / 86_400_000)
  const label = short.format(date)
  if (days < 0) return <ConfidenceTag level="block">Expirée le {label}</ConfidenceTag>
  if (days <= 30) return <ConfidenceTag level="check">Expire le {label}</ConfidenceTag>
  return <ConfidenceTag level="ok">Valable jusqu'au {label}</ConfidenceTag>
}

/** Pièces administratives : RCCM, attestations fiscale et sociale, agréments… (UC01). */
export const corporateDocConfig: RecordConfig = {
  type: "corporate_document",
  base: "/api/v1/corporate-documents",
  route: "/pieces",
  title: "Pièces administratives",
  intro: "Les pièces exigées par les avis, avec leur échéance. Une pièce expirée avant la date limite d'un dossier bloque son export.",
  newLabel: "Nouvelle pièce",
  newTitle: "Nouvelle pièce administrative",
  searchPlaceholder: "Numéro, organisme…",
  empty: { title: "Aucune pièce administrative", hint: "Enregistrez les pièces en cours de validité du Cabinet et de ses partenaires." },
  name: (row) => (row.number ? `Pièce n° ${String(row.number)}` : "Pièce administrative"),
  useOptions: useTypeOptions,
  filters: [{ key: "type", label: "Type de pièce", optionsFrom: "doc_type" }],
  fields: [
    { name: "doc_type", label: "Type de pièce", kind: "select", required: true, createOnly: true },
    { name: "entity", label: "Titulaire", kind: "organization", entity: true, required: true, createOnly: true },
    { name: "number", label: "Numéro", kind: "text" },
    { name: "issuer", label: "Délivrée par", kind: "text" },
    { name: "issued_on", label: "Délivrée le", kind: "date" },
    { name: "expires_on", label: "Expire le", kind: "date", help: "Vide : l'échéance découle de la durée de validité du type de pièce." },
    { name: "notes", label: "Notes", kind: "textarea", wide: true },
  ],
  columns: [
    {
      key: "type",
      header: "Pièce",
      wrap: true,
      cell: (row) => (
        <Link to={`/pieces/${row.id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
          <TypeName id={row.doc_type} />
        </Link>
      ),
    },
    { key: "entity", header: "Titulaire", cell: (row) => <OrganizationName id={row.entity as string} /> },
    { key: "number", header: "Numéro", secondary: true, cell: (row) => <span className="tabular text-ink-muted">{String(row.number ?? "")}</span> },
    { key: "validity", header: "Validité", cell: (row) => <Validity expiry={row.effective_expiry} /> },
    statusColumn,
  ],
}
