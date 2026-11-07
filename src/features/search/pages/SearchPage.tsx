import { CalendarClock, FileText, RotateCcw, Search, SearchX, TriangleAlert } from "lucide-react"
import { Link } from "react-router"

import { ApiError, userMessage } from "@/api"
import { Pagination, SearchBox, useListParams } from "@/components/data"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { KIND_LABEL } from "@/features/documents"
import { cn } from "@/lib/utils"

import { linkOf, RESULT_TYPE, useSearch, type SearchResult, type SnippetPart } from "../api"

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })
const formatDay = (value: string) => day.format(new Date(`${value}T12:00:00`))
const ALL = "tous"

/** Extrait d'un résultat : les mots trouvés sont mis en valeur, le texte n'est jamais lu comme du HTML. */
function Snippet({ parts }: { parts: SnippetPart[] }) {
  if (!parts.length) return null
  return (
    <p className="mt-1 max-w-[90ch] text-[0.8125rem] leading-relaxed text-ink-muted">
      {parts.map((part, index) =>
        part.match ? (
          <mark key={index} className="rounded-sm bg-blue-100 px-0.5 font-semibold text-blue-950">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </p>
  )
}

function Result({ result }: { result: SearchResult }) {
  const link = linkOf(result)
  const type = RESULT_TYPE[result.source_type]?.label ?? result.source_type
  const kind = result.source_type === "document" ? KIND_LABEL[result.kind as keyof typeof KIND_LABEL] : null
  const pages = [...new Set(result.sources.map((source) => source.page).filter((page): page is number => Boolean(page)))]
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {link ? (
          <Link to={link} className="text-[0.9375rem] font-bold text-ink hover:text-blue-700 hover:underline">
            {result.title}
          </Link>
        ) : (
          <span className="text-[0.9375rem] font-bold text-ink">{result.title}</span>
        )}
        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-2xs font-bold text-blue-800">{type}</span>
        {kind ? <span className="text-xs text-ink-muted">{kind}</span> : null}
        {result.issued_on ? <span className="text-xs text-ink-muted">Émise le {formatDay(result.issued_on)}</span> : null}
      </div>
      {!result.proves_facts ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-check">
          <TriangleAlert className="size-3.5" aria-hidden="true" />
          Produit par la plateforme : ne prouve aucun fait.
        </p>
      ) : null}
      <Snippet parts={result.snippet} />
      {pages.length || (result.source_type !== "document" && result.sources.length) ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <FileText className="size-3.5" aria-hidden="true" />
          {result.source_type === "document"
            ? `Page${pages.length > 1 ? "s" : ""} ${pages.join(", ")}`
            : result.sources.map((source) => `${source.document_title}${source.page ? `, p. ${source.page}` : ""}`).join(" · ")}
        </p>
      ) : null}
    </li>
  )
}

/**
 * Recherche dans toute la base (UC04) : pièces et fiches publiées, chaque résultat avec sa
 * source. « À la date du » rejoue la base telle qu'elle était (H5) : ce qui a été émis après est
 * écarté, et les pièces sans date aussi, en le disant.
 */
export function SearchPage() {
  const { params, update } = useListParams(["type", "kind", "as_of"])
  const { type = "", kind = "", as_of: asOf = "" } = params.filters
  const search = useSearch({ q: params.q, type: type || undefined, kind: kind || undefined, as_of: asOf || undefined, page: params.page })
  const data = search.data
  const tooLong = search.error instanceof ApiError && search.error.status === 400

  return (
    <Page>
      <header className="mb-6 max-w-[68ch]">
        <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Recherche</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
          Dans les pièces et les fiches publiées. Chaque résultat mène à sa source, à la page citée.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SearchBox value={params.q} onSearch={(q) => update({ q })} label="Mots recherchés" placeholder="Un client, un expert, un numéro, une expression…" />
        <Select value={type || ALL} onValueChange={(next) => update({ filters: { type: next === ALL ? null : next, kind: next === "document" ? kind || null : null } })}>
          <SelectTrigger className="w-[min(14rem,100%)]" aria-label="Type de résultat">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tout</SelectItem>
            {Object.entries(RESULT_TYPE).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {type === "document" ? (
          <Select value={kind || ALL} onValueChange={(next) => update({ filters: { kind: next === ALL ? null : next } })}>
            <SelectTrigger className="w-[min(16rem,100%)]" aria-label="Sorte de pièce">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes les pièces</SelectItem>
              {Object.entries(KIND_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <div className="space-y-1">
          <Label htmlFor="as-of" className="flex items-center gap-1.5 text-xs text-ink-muted">
            <CalendarClock className="size-3.5" aria-hidden="true" />À la date du
          </Label>
          <Input id="as-of" type="date" value={asOf} onChange={(event) => update({ filters: { as_of: event.target.value || null } })} className="w-[min(11rem,100%)]" />
        </div>
      </div>

      {asOf && data?.undated_excluded ? (
        <p className="mb-3 text-xs text-check">
          {data.undated_excluded} pièce(s) sans date d'émission écartée(s) : on ne peut pas savoir si elles existaient le {formatDay(asOf)}.
        </p>
      ) : null}

      {!params.q.trim() ? (
        <div className="grid place-items-center rounded-xl bg-card px-6 py-14 text-center ring-1 ring-line">
          <Search className="size-8 text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ink">Que cherchez-vous ?</p>
          <p className="mt-1 max-w-[56ch] text-[0.8125rem] text-ink-muted">
            Un nom de client, un expert, un numéro de RCCM, une expression d'un rapport. Les mots se cherchent sous toutes leurs formes.
          </p>
        </div>
      ) : search.isError ? (
        <div role="alert" className="grid place-items-center rounded-xl bg-card px-6 py-12 text-center ring-1 ring-line">
          <p className="text-sm font-bold text-ink">{tooLong ? "Recherche refusée" : "La recherche a échoué"}</p>
          <p className="mt-1 max-w-[56ch] text-[0.8125rem] text-ink-muted">
            {tooLong && search.error instanceof ApiError ? Object.values((search.error.details as Record<string, string[]>) ?? {}).flat().join(" ") || userMessage(search.error) : userMessage(search.error)}
          </p>
          {!tooLong ? (
            <Button variant="outline" className="mt-4" onClick={() => void search.refetch()}>
              <RotateCcw data-icon="inline-start" aria-hidden="true" />
              Réessayer
            </Button>
          ) : null}
        </div>
      ) : !data ? (
        <div className="space-y-4 rounded-xl bg-card p-5 ring-1 ring-line" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-[40%]" />
              <Skeleton className="h-3 w-[85%]" />
            </div>
          ))}
        </div>
      ) : data.results.length === 0 ? (
        <div className="grid place-items-center rounded-xl bg-card px-6 py-14 text-center ring-1 ring-line">
          <SearchX className="size-8 text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ink">Aucun résultat pour « {params.q} »</p>
          <p className="mt-1 max-w-[56ch] text-[0.8125rem] text-ink-muted">
            Essayez un mot plus court ou plus général{type || asOf ? ", ou retirez un filtre" : ""}. Seules les fiches publiées sont cherchées.
          </p>
        </div>
      ) : (
        <>
          <ol className={cn("divide-y divide-line rounded-xl bg-card px-5 ring-1 ring-line", search.isFetching && "opacity-60")} aria-label="Résultats">
            {data.results.map((result) => (
              <Result key={`${result.source_type}-${result.source_id}`} result={result} />
            ))}
          </ol>
          <Pagination page={params.page} count={data.count} onPage={(page) => update({ page })} />
        </>
      )}
    </Page>
  )
}
