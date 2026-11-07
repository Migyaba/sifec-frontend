import { useQuery } from "@tanstack/react-query"

import { api, call } from "@/api"
import { ConfidenceTag } from "@/components/sifec/confidence"
import { MISSION_NATURE } from "@/features/records"

/**
 * Méthodologies validées par type de mission (H6) : la plateforme n'écrit jamais une méthodologie
 * à partir de rien, il en faut au moins une publiée par type avant la phase 3.
 */
export function Coverage() {
  const coverage = useQuery({
    queryKey: ["methodologies", "coverage"],
    queryFn: () => call(api.GET("/api/v1/methodologies/coverage/")),
  })
  const counts = new Map((coverage.data?.results ?? []).map((row) => [row.nature, row.count]))
  if (!coverage.data) return null
  const missing = Object.keys(MISSION_NATURE).filter((nature) => !counts.get(nature))
  return (
    <section aria-labelledby="couverture-title" className="rounded-xl bg-card p-4 ring-1 ring-line">
      <h2 id="couverture-title" className="text-sm font-extrabold text-ink">
        Méthodologies publiées par type de mission
      </h2>
      <p className="mt-0.5 text-xs text-ink-muted">
        {missing.length
          ? `${missing.length} type(s) de mission sans méthodologie publiée : la rédaction par l'IA n'y sera pas possible.`
          : "Chaque type de mission a au moins une méthodologie publiée."}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {Object.entries(MISSION_NATURE).map(([nature, label]) => {
          const count = counts.get(nature) ?? 0
          return (
            <li key={nature}>
              <ConfidenceTag level={count ? "ok" : "check"}>
                {label} : {count}
              </ConfidenceTag>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
