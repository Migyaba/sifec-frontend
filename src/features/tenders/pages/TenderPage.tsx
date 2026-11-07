import { Pencil } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router"

import { userMessage } from "@/api"
import { Deadline } from "@/components/sifec/deadline"
import { Notice } from "@/components/sifec/notice"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MISSION_NATURE, OrganizationName, PROCEDURE } from "@/features/records"

import { useSheets, useTender, useUpdateTender } from "../api"
import { RequirementSheetPanel } from "../components/RequirementSheet"
import { TenderDocuments } from "../components/TenderDocuments"
import { TenderForm } from "../components/TenderForm"
import { payloadOf, valuesOf } from "../tenderValues"
import { daysLeft, LANGUAGE } from "../labels"

const deadlineFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

/** Avis (UC06, UC07, UC14) : identification, documents, fiche d'exigences et ses versions. */
export function TenderPage() {
  const { id = "" } = useParams()
  const tender = useTender(id)
  const update = useUpdateTender(id)
  const sheets = useSheets(id, Boolean(tender.data?.extraction_pending))
  const [editing, setEditing] = useState(false)

  if (tender.isError) {
    return (
      <Page>
        <Notice tone="block" title="Avis introuvable">
          {userMessage(tender.error)}
        </Notice>
      </Page>
    )
  }
  if (!tender.data) {
    return (
      <Page>
        <Skeleton className="h-8 w-[40%]" />
        <Skeleton className="mt-4 h-40 w-full" />
      </Page>
    )
  }
  const data = tender.data
  const left = data.submission_deadline ? daysLeft(data.submission_deadline) : null
  const facts: [string, React.ReactNode][] = [
    ["Procédure", PROCEDURE[data.procedure] ?? data.procedure],
    ["Autorité contractante", data.contracting_authority ? <OrganizationName key="authority" id={data.contracting_authority} /> : "Non renseignée"],
    ["Bailleur", data.donor ? <OrganizationName key="donor" id={data.donor} /> : "Non renseigné"],
    ["Type de mission", data.nature ? (MISSION_NATURE[data.nature] ?? data.nature) : "Non renseigné"],
    ["Secteur", data.sector || "Non renseigné"],
    ["Langue", LANGUAGE[data.language ?? "fr"] ?? data.language],
  ]

  return (
    <Page>
      <nav aria-label="Fil d'Ariane" className="mb-2 text-xs text-ink-muted">
        <Link to="/avis" className="hover:text-blue-700 hover:underline">
          Avis
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{data.reference}</span>
      </nav>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[80ch]">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">{data.title}</h1>
          <p className="mt-1 text-[0.9375rem] text-ink-muted">{data.reference}</p>
        </div>
        <div className="flex items-center gap-2">
          {data.submission_deadline && left !== null ? (
            left >= 0 ? (
              <span title={deadlineFormat.format(new Date(data.submission_deadline))}>
                <Deadline date={shortDay.format(new Date(data.submission_deadline))} daysLeft={left} />
              </span>
            ) : (
              <span className="text-xs font-semibold text-ink-muted">Date limite passée</span>
            )
          ) : (
            <span className="text-xs text-ink-muted">Date limite à lire dans l'avis</span>
          )}
          {editing ? null : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Modifier l'avis
            </Button>
          )}
        </div>
      </header>

      {editing ? (
        <section aria-label="Modifier l'avis" className="mb-5 rounded-xl bg-card p-5 ring-1 ring-line">
          <TenderForm
            initial={valuesOf(data)}
            label="Modifier l'avis"
            submitLabel="Enregistrer"
            pending={update.isPending}
            onCancel={() => setEditing(false)}
            onSubmit={(values, fail) => update.mutate(payloadOf(values), { onSuccess: () => setEditing(false), onError: fail })}
          />
        </section>
      ) : (
        <dl className="mb-5 grid gap-x-6 gap-y-3 rounded-xl bg-card px-5 py-4 ring-1 ring-line sm:grid-cols-3 xl:grid-cols-6">
          {facts.map(([term, value]) => (
            <div key={term} className="min-w-0">
              <dt className="text-xs text-ink-muted">{term}</dt>
              <dd className="mt-0.5 text-[0.8125rem] font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="space-y-5">
        <TenderDocuments tenderId={id} hasSheet={Boolean(sheets.data?.length)} />
        <RequirementSheetPanel tender={data} />
      </div>
    </Page>
  )
}
