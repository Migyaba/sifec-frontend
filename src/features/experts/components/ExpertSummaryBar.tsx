import { ConfidenceTag } from "@/components/sifec/confidence"

import { useExpertSummary } from "../api"

const years = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 })

/** Ce qu'un dossier lira de cet expert : expérience comptée, accord pour le CV, CV à jour ou non. */
export function ExpertSummaryBar({ expertId }: { expertId: string }) {
  const summary = useExpertSummary(expertId)
  if (!summary.data) return null
  const { years_of_experience, experiences, consent, cv_warning } = summary.data
  return (
    <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-card px-4 py-3 text-[0.8125rem] ring-1 ring-line">
      <div>
        <dt className="text-xs text-ink-muted">Expérience comptée dans les dossiers</dt>
        <dd className="tabular font-bold text-ink">
          {years.format(Number(years_of_experience))} an(s) · {experiences} expérience(s)
        </dd>
        <dd className="text-2xs text-ink-muted">Version publiée seulement : un dossier ne cite que des faits vérifiés.</dd>
      </div>
      <div>
        <dt className="text-xs text-ink-muted">Accord pour l'usage du CV</dt>
        <dd className="mt-0.5">
          <ConfidenceTag level={consent.valid ? "ok" : "block"}>{consent.valid ? "Accord valable" : "Pas d'accord valable"}</ConfidenceTag>
          {consent.reason ? <span className="ml-2 text-xs text-ink-muted">{consent.reason}</span> : null}
        </dd>
      </div>
      {cv_warning ? (
        <div>
          <dt className="text-xs text-ink-muted">CV</dt>
          <dd className="mt-0.5">
            <ConfidenceTag level="check">{cv_warning}</ConfidenceTag>
          </dd>
        </div>
      ) : null}
    </dl>
  )
}
