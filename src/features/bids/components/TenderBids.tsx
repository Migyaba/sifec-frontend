import { BriefcaseBusiness } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

import { userMessage } from "@/api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { useBids } from "../api"
import { BidStatusBadge } from "./BidStatusBadge"
import { NewBidForm } from "./NewBidForm"

/** Dossiers montés sur un avis, sur la page de l'avis, et de quoi en monter un. */
export function TenderBids({ tenderId }: { tenderId: string }) {
  const bids = useBids({ tender: tenderId })
  const [creating, setCreating] = useState(false)
  const rows = bids.data?.results ?? []
  return (
    <section aria-labelledby="dossiers-avis" className="rounded-xl bg-card ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="dossiers-avis" className="text-sm font-extrabold text-ink">
          Dossiers sur cet avis
        </h2>
        {creating ? null : (
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            <BriefcaseBusiness data-icon="inline-start" aria-hidden="true" />
            Monter un dossier
          </Button>
        )}
      </div>
      {creating ? (
        <div className="p-4">
          <NewBidForm tenderId={tenderId} onClose={() => setCreating(false)} />
        </div>
      ) : null}
      {bids.isPending ? (
        <Skeleton className="m-4 h-4 w-[50%]" />
      ) : bids.isError ? (
        <p className="px-4 py-3 text-xs text-block">{userMessage(bids.error)}</p>
      ) : rows.length ? (
        <ul className="divide-y divide-line">
          {rows.map((bid) => (
            <li key={bid.id}>
              <Link to={`/dossiers/${bid.id}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[0.8125rem] hover:bg-muted">
                <span className="min-w-0 flex-1 font-semibold text-ink">Pour le compte de {bid.lead_entity_name}</span>
                <span className="tabular text-xs text-ink-muted">
                  Étape {bid.steps_done} sur {bid.steps_total}
                </span>
                <BidStatusBadge status={bid.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : creating ? null : (
        <p className="px-4 py-4 text-[0.8125rem] text-ink-muted">Aucun dossier visible pour vous sur cet avis.</p>
      )}
    </section>
  )
}
