import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, call, type components } from "@/api"

type S = components["schemas"]
export type Tender = S["Tender"]
export type TenderDocument = S["TenderDocument"]
export type TenderDocumentKind = S["TenderDocumentKindEnum"]
export type Sheet = S["RequirementSheet"]
export type Requirement = S["Requirement"]
export type Category = S["RequirementCategoryEnum"]

export const tenderKeys = {
  all: ["tenders"] as const,
  list: (query: Record<string, string | number>) => ["tenders", "list", query] as const,
  detail: (id: string) => ["tenders", "detail", id] as const,
  documents: (id: string) => ["tenders", "documents", id] as const,
  sheets: (id: string) => ["tenders", "sheets", id] as const,
  requirements: (sheet: string, removed: boolean) => ["tenders", "requirements", sheet, removed] as const,
}

export function useTenders(query: Record<string, string | number>) {
  return useQuery({
    queryKey: tenderKeys.list(query),
    queryFn: () => call(api.GET("/api/v1/tenders/", { params: { query: query as never } })),
    placeholderData: keepPreviousData,
  })
}

export function useTender(id: string) {
  return useQuery({ queryKey: tenderKeys.detail(id), queryFn: () => call(api.GET("/api/v1/tenders/{id}/", { params: { path: { id } } })) })
}

export function useCreateTender() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: S["TenderRequest"]) => call(api.POST("/api/v1/tenders/", { body })),
    onSuccess: () => client.invalidateQueries({ queryKey: tenderKeys.all }),
  })
}

export function useUpdateTender(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: S["PatchedTenderRequest"]) => call(api.PATCH("/api/v1/tenders/{id}/", { params: { path: { id } }, body })),
    onSuccess: (tender) => {
      client.setQueryData(tenderKeys.detail(id), tender)
      void client.invalidateQueries({ queryKey: ["tenders", "list"] })
    },
  })
}

/** Documents de l'avis, relus tant que l'un d'eux est encore en lecture. */
export function useTenderDocuments(id: string) {
  return useQuery({
    queryKey: tenderKeys.documents(id),
    queryFn: () => call(api.GET("/api/v1/tenders/{id}/documents/", { params: { path: { id } } })),
    refetchInterval: (query) => (query.state.data?.some((document) => document.reading_status === "pending" || document.reading_status === "processing") ? 3000 : false),
  })
}

export function useAddDocument(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: S["TenderDocumentRequest"]) => call(api.POST("/api/v1/tenders/{id}/documents/", { params: { path: { id } }, body })),
    onSuccess: () => {
      // Un additif relance la fiche : l'avis, ses documents et ses versions sont relus.
      void client.invalidateQueries({ queryKey: tenderKeys.documents(id) })
      void client.invalidateQueries({ queryKey: tenderKeys.sheets(id) })
      void client.invalidateQueries({ queryKey: tenderKeys.detail(id) })
    },
  })
}

/**
 * Versions de la fiche, de la plus récente à la plus ancienne. Relues pendant une extraction, ou
 * tant qu'une extraction attend la lecture des documents.
 */
export function useSheets(id: string, waiting: boolean) {
  return useQuery({
    queryKey: tenderKeys.sheets(id),
    queryFn: () => call(api.GET("/api/v1/tenders/{id}/sheets/", { params: { path: { id } } })),
    refetchInterval: (query) => (waiting || query.state.data?.some((sheet) => sheet.status === "extracting") ? 2500 : false),
  })
}

export function useExtract(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => call(api.POST("/api/v1/tenders/{id}/extract/", { params: { path: { id } } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: tenderKeys.sheets(id) })
      void client.invalidateQueries({ queryKey: tenderKeys.detail(id) })
    },
  })
}

export function useRequirements(sheet: string | undefined, removed: boolean) {
  return useQuery({
    queryKey: tenderKeys.requirements(sheet ?? "", removed),
    enabled: Boolean(sheet),
    queryFn: () => call(api.GET("/api/v1/requirement-sheets/{id}/requirements/", { params: { path: { id: sheet ?? "" }, query: removed ? { removed: true } : {} } })),
  })
}

/** Après une correction, la fiche (points ouverts, empreinte) et ses exigences sont relues. */
function useSheetMutation<T>(tenderId: string, fn: (values: T) => Promise<unknown>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["tenders", "requirements"] })
      void client.invalidateQueries({ queryKey: tenderKeys.sheets(tenderId) })
    },
  })
}

export const useCorrect = (tenderId: string) =>
  useSheetMutation(tenderId, ({ id, ...body }: { id: string; value?: string; note?: string }) => call(api.PATCH("/api/v1/requirements/{id}/", { params: { path: { id } }, body })))

export const useRemove = (tenderId: string) =>
  useSheetMutation(tenderId, ({ id, reason }: { id: string; reason: string }) => call(api.POST("/api/v1/requirements/{id}/remove/", { params: { path: { id } }, body: { reason } })))

export const useAddRequirement = (tenderId: string) =>
  useSheetMutation(tenderId, ({ sheet, ...body }: S["NewRequirementRequest"] & { sheet: string }) =>
    call(api.POST("/api/v1/requirement-sheets/{id}/requirements/", { params: { path: { id: sheet } }, body })),
  )
