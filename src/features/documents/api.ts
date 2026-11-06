import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, call, type components } from "@/api"
import { taskInterval, track } from "@/components/tasks"

import { isProcessing, LEGIBILITY, STATUS_LABEL, type DocumentKind } from "./labels"

export type DocumentRow = components["schemas"]["Document"]
export type DocumentDetail = components["schemas"]["DocumentDetail"]
export type DocumentVersion = components["schemas"]["DocumentVersion"]
export type DocumentPageText = components["schemas"]["Page"]

/**
 * Version à montrer : la version courante, ou, tant qu'aucune n'est lue (`current_version` vide),
 * la plus récente, même en cours de lecture.
 */
export function shownVersion(doc: DocumentDetail): DocumentVersion | null {
  return doc.current_version ?? [...doc.versions].sort((a, b) => b.number - a.number)[0] ?? null
}

export const documentKeys = {
  all: ["documents"] as const,
  list: (query: Record<string, unknown>) => ["documents", "list", query] as const,
  detail: (id: string) => ["documents", "detail", id] as const,
  pages: (versionId: string, page: number) => ["documents", "pages", versionId, page] as const,
}

export function useDocuments(query: { page?: number; q?: string; kind?: string; status?: string }) {
  return useQuery({
    queryKey: documentKeys.list(query),
    queryFn: () =>
      call(
        api.GET("/api/v1/documents/", {
          params: { query: query as { page?: number; q?: string; kind?: DocumentKind; status?: DocumentVersion["status"] } },
        }),
      ),
    placeholderData: keepPreviousData,
  })
}

/** Fiche d'un document ; relue tant que sa version courante est en traitement. */
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => call(api.GET("/api/v1/documents/{id}/", { params: { path: { id } } })),
    // Relue tant qu'une version est en lecture, la première comme une nouvelle.
    refetchInterval: taskInterval<DocumentDetail>((data) => !data?.versions.some((version) => isProcessing(version.status))),
  })
}

export function useVersionPages(versionId: string | undefined, page: number) {
  return useQuery({
    queryKey: documentKeys.pages(versionId ?? "", page),
    queryFn: () =>
      call(api.GET("/api/v1/documents/versions/{id}/pages/", { params: { path: { id: versionId as string }, query: { page } } })),
    enabled: Boolean(versionId),
    placeholderData: keepPreviousData,
  })
}

export function useSetKind(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (kind: DocumentKind) =>
      call(api.PUT("/api/v1/documents/{id}/kind/", { params: { path: { id } }, body: { kind } })),
    onSuccess: () => client.invalidateQueries({ queryKey: documentKeys.all }),
  })
}

export function useSetIssuedOn(documentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ versionId, issuedOn }: { versionId: string; issuedOn: string | null }) =>
      call(
        api.PUT("/api/v1/documents/versions/{id}/issued-on/", {
          params: { path: { id: versionId } },
          body: { issued_on: issuedOn },
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: documentKeys.detail(documentId) }),
  })
}

/** Adresse de téléchargement, valable quelques minutes : demandée au moment du clic. */
export async function downloadUrl(versionId: string): Promise<string> {
  const { url } = await call(api.GET("/api/v1/documents/versions/{id}/download/", { params: { path: { id: versionId } } }))
  return url
}

/**
 * Après un dépôt, le serveur lit le fichier en tâche de fond (texte, OCR, lisibilité, doublons).
 * Le suivi annonce le résultat, même si la personne a quitté l'écran.
 */
export function trackProcessing(version: DocumentVersion, onSettled?: () => void) {
  const documentId = version.document
  track({
    id: `document-${version.id}`,
    label: `Lecture de « ${version.original_filename} »`,
    href: `/documents/${documentId}`,
    poll: () => call(api.GET("/api/v1/documents/{id}/", { params: { path: { id: documentId } } })),
    outcome: (detail) => {
      const current = detail.versions.find((item) => item.id === version.id) ?? detail.current_version
      if (!current || isProcessing(current.status)) return null
      if (current.status === "failed") return { ok: false, message: current.error || "Le fichier n'a pas pu être lu." }
      if (current.status === "duplicate") return { ok: true, message: "Doublon exact d'un document déjà dans la base." }
      const pages = current.page_count ? `${current.page_count} page(s)` : "Lu"
      return { ok: true, message: `${pages}, lisibilité : ${LEGIBILITY[current.legibility].label.toLowerCase()}.` }
    },
    onSettled,
  })
}

export { STATUS_LABEL }
