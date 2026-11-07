import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, call, type components } from "@/api"
import { taskInterval, track } from "@/components/tasks"

type S = components["schemas"]
export type Batch = S["BackfillBatch"]
export type BatchStatus = S["BatchStatusEnum"]
export type Item = S["BackfillItem"]
export type ItemStatus = S["BackfillItemStatusEnum"]

export const BATCH_STATUS: Record<BatchStatus, string> = {
  draft: "À préparer",
  scanning: "Inventaire en cours",
  scanned: "Inventaire prêt",
  running: "Dépôt en cours",
  submitted: "Fichiers déposés",
  failed: "Échec de l'inventaire",
}

export const ITEM_STATUS: Record<ItemStatus, string> = {
  pending: "À déposer",
  submitted: "Déposé",
  duplicate: "Doublon exact, non déposé",
  skipped: "Écarté",
  rejected: "Refusé",
  failed: "Échec du dépôt",
}

export const DATE_SOURCE: Record<string, string> = {
  filename: "Année du nom de fichier (31 décembre)",
  modified: "Date de dernière modification du fichier",
}

const busy = (status: BatchStatus | undefined) => status === "scanning" || status === "running"

export const batchKeys = {
  all: ["backfill"] as const,
  list: (page: number) => ["backfill", "list", page] as const,
  one: (id: string) => ["backfill", "one", id] as const,
  report: (id: string) => ["backfill", "report", id] as const,
  items: (id: string, query: Record<string, unknown>) => ["backfill", "items", id, query] as const,
}

export function useBatches(page: number) {
  return useQuery({
    queryKey: batchKeys.list(page),
    queryFn: () => call(api.GET("/api/v1/backfill-batches/", { params: { query: page > 1 ? { page } : {} } })),
    placeholderData: keepPreviousData,
  })
}

/** Un lot ; relu tant qu'un inventaire ou un dépôt est en cours. */
export function useBatch(id: string) {
  return useQuery({
    queryKey: batchKeys.one(id),
    queryFn: () => call(api.GET("/api/v1/backfill-batches/{id}/", { params: { path: { id } } })),
    refetchInterval: taskInterval<Batch>((batch) => !busy(batch?.status)),
  })
}

/** Rapport de reprise : l'état des fichiers vient de la lecture en tâche de fond, relu tant qu'elle avance. */
export function useReport(id: string, status: BatchStatus | undefined) {
  return useQuery({
    queryKey: batchKeys.report(id),
    queryFn: () => call(api.GET("/api/v1/backfill-batches/{id}/report/", { params: { path: { id } } })),
    refetchInterval: (query) => (busy(status) || (query.state.data && !query.state.data.complete) ? 5000 : false),
  })
}

export function useItems(id: string, query: { page?: number; status?: string }) {
  return useQuery({
    queryKey: batchKeys.items(id, query),
    queryFn: () => call(api.GET("/api/v1/backfill-batches/{id}/items/", { params: { path: { id }, query } })),
    placeholderData: keepPreviousData,
  })
}

export function useCreateBatch() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: S["BackfillBatchRequest"]) => call(api.POST("/api/v1/backfill-batches/", { body })),
    onSuccess: () => client.invalidateQueries({ queryKey: batchKeys.all }),
  })
}

/** Inventaire ou dépôt : lancé, puis suivi jusqu'à son terme, annoncé même hors de l'écran. */
export function useBatchAction(batch: Pick<Batch, "id" | "name">, action: "scan" | "run") {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () =>
      action === "scan"
        ? call(api.POST("/api/v1/backfill-batches/{id}/scan/", { params: { path: { id: batch.id } } }))
        : call(api.POST("/api/v1/backfill-batches/{id}/run/", { params: { path: { id: batch.id } } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: batchKeys.all })
      track({
        id: `backfill-${action}-${batch.id}`,
        label: `${action === "scan" ? "Inventaire" : "Dépôt"} : ${batch.name}`,
        href: `/reprise/${batch.id}`,
        poll: () => call(api.GET("/api/v1/backfill-batches/{id}/", { params: { path: { id: batch.id } } })),
        outcome: (current) => {
          if (busy(current.status)) return null
          if (current.status === "failed") return { ok: false, message: "L'inventaire a échoué : voir le rapport du lot." }
          return { ok: true, message: action === "scan" ? "Inventaire prêt : vérifiez le périmètre avant de déposer." : "Fichiers déposés : leur lecture continue en tâche de fond." }
        },
        onSettled: () => void client.invalidateQueries({ queryKey: batchKeys.all }),
      })
    },
  })
}
