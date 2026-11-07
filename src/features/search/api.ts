import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { api, call, type components } from "@/api"

export type SearchResult = components["schemas"]["SearchResult"]
export type SnippetPart = components["schemas"]["SnippetPart"]

export type SearchQuery = { q: string; type?: string; kind?: string; as_of?: string; page?: number }

/** Recherche dans les pièces et les fiches publiées (UC04). Rien n'est lancé sans mots. */
export function useSearch(query: SearchQuery) {
  const q = query.q.trim()
  return useQuery({
    queryKey: ["search", { ...query, q }],
    queryFn: () => call(api.GET("/api/v1/search/", { params: { query: { ...query, q } } })),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
  })
}

/** Type de résultat : une pièce, ou un type de fiche publiée. */
export const RESULT_TYPE: Record<string, { label: string; route?: string }> = {
  document: { label: "Pièce", route: "/documents" },
  expert: { label: "Expert", route: "/experts" },
  mission: { label: "Référence", route: "/references" },
  corporate_document: { label: "Pièce administrative", route: "/pieces" },
  institution: { label: "Fiche institutionnelle", route: "/institutions" },
  past_dossier: { label: "Dossier antérieur", route: "/anciens-dossiers" },
  methodology: { label: "Méthodologie" },
  form_template: { label: "Formulaire type" },
  doc_template: { label: "Modèle de document" },
  text_block: { label: "Bloc de texte" },
}

/** Lien d'un résultat : la fiche, ou la pièce ouverte à la page citée. */
export function linkOf(result: SearchResult): string | null {
  const route = RESULT_TYPE[result.source_type]?.route
  if (!route) return null
  const page = result.source_type === "document" ? result.sources[0]?.page : null
  return `${route}/${result.source_id}${page ? `?page=${page}` : ""}`
}
