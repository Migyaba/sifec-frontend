import { ArrowRight, Signature } from "lucide-react"
import { Link } from "react-router"

import { userMessage } from "@/api"
import { Notice } from "@/components/sifec/notice"
import { Page } from "@/components/sifec/page"
import { ValidationGlyph } from "@/components/sifec/pathway"
import { Skeleton } from "@/components/ui/skeleton"

import { useWaitingValidations } from "../api"

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

/**
 * Validations qui attendent la personne connectée : celles de son rôle, et celles qu'une
 * délégation écrite en vigueur lui confie. La plus ancienne d'abord.
 */
export function ValidationsPage() {
  const waiting = useWaitingValidations()
  return (
    <Page>
      <header className="mb-6 max-w-[68ch]">
        <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Validations</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
          Les décisions qui vous attendent sur les dossiers en cours, la plus ancienne d'abord. Chaque validation porte sur ce que vous avez sous les yeux : si le contenu change, elle est à refaire.
        </p>
      </header>
      {waiting.isError ? (
        <Notice tone="block" title="Validations indisponibles">
          {userMessage(waiting.error)}
        </Notice>
      ) : waiting.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : waiting.data.length ? (
        <ul className="divide-y divide-line rounded-xl bg-card ring-1 ring-line" aria-label="Validations en attente">
          {waiting.data.map((item) => (
            <li key={`${item.bid_id}-${item.step}`}>
              <Link to={`/dossiers/${item.bid_id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted">
                <ValidationGlyph className="size-5 shrink-0 text-blue-700" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.8125rem] font-semibold text-ink">{item.label}</span>
                  <span className="block text-xs text-ink-muted">{item.reference}</span>
                </span>
                {item.delegated ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
                    <Signature className="size-3.5" aria-hidden="true" />
                    Par délégation
                  </span>
                ) : null}
                <span className="text-xs text-ink-muted">Attend depuis le {when.format(new Date(item.waiting_since))}</span>
                <ArrowRight className="size-4 text-ink-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl bg-card px-5 py-8 text-center ring-1 ring-line">
          <p className="text-sm font-bold text-ink">Aucune validation ne vous attend</p>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">Les validations apparaissent ici dès que l'étape qui les précède est faite.</p>
        </div>
      )}
    </Page>
  )
}
