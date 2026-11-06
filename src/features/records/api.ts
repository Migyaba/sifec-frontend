import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { api, call, type components } from "@/api"

type S = components["schemas"]
export type Evidence = S["Evidence"]
export type RecordVersion = S["RecordVersion"]
export type Confidence = S["Confidence"]

/** Champs communs à toutes les fiches, renvoyés par l'API de chaque type. */
export type RecordBase = {
  id: string
  status: S["RecordStatusEnum"]
  contributors: unknown
  published_number: number | null
  published_at: string | null
  review_comment: string
  updated_at: string
}

export const recordKeys = {
  of: (type: string, id: string) => ["records", type, id] as const,
  confidence: (type: string, id: string) => ["records", type, id, "confidence"] as const,
  evidence: (type: string, id: string) => ["records", type, id, "evidence"] as const,
  versions: (type: string, id: string) => ["records", type, id, "versions"] as const,
}

/** Après un changement de cycle ou de preuve : tout ce qui concerne cette fiche est relu. */
export function invalidateRecord(client: QueryClient, id: string) {
  return client.invalidateQueries({ predicate: (query) => query.queryKey.includes(id) })
}

const path = (type: string, id: string) => ({ params: { path: { record_type: type, id } } })

export function contributorsOf(record: Pick<RecordBase, "contributors">): string[] {
  return Array.isArray(record.contributors) ? record.contributors.map(String) : []
}

export function useConfidence(type: string, id: string) {
  return useQuery({
    queryKey: recordKeys.confidence(type, id),
    queryFn: () => call(api.GET("/api/v1/records/{record_type}/{id}/confidence/", path(type, id))),
  })
}

export function useEvidence(type: string, id: string) {
  return useQuery({
    queryKey: recordKeys.evidence(type, id),
    queryFn: () => call(api.GET("/api/v1/records/{record_type}/{id}/evidence/", path(type, id))),
  })
}

export function useVersions(type: string, id: string) {
  return useQuery({
    queryKey: recordKeys.versions(type, id),
    queryFn: () => call(api.GET("/api/v1/records/{record_type}/{id}/versions/", path(type, id))),
  })
}

export function useAddEvidence(type: string, id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: S["EvidenceCreateRequest"]) =>
      call(api.POST("/api/v1/records/{record_type}/{id}/evidence/", { ...path(type, id), body })),
    onSuccess: () => invalidateRecord(client, id),
  })
}

export function useRemoveEvidence(type: string, id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (evidenceId: string) =>
      call(
        api.DELETE("/api/v1/records/{record_type}/{id}/evidence/{evidence_id}/", {
          params: { path: { record_type: type, id, evidence_id: evidenceId } },
        }),
      ),
    onSuccess: () => invalidateRecord(client, id),
  })
}

/** Les quatre gestes du cycle : soumettre, publier, renvoyer, archiver. */
export function useCycle(type: string, id: string) {
  const client = useQueryClient()
  const done = () => invalidateRecord(client, id)
  return {
    submit: useMutation({
      mutationFn: () => call(api.POST("/api/v1/records/{record_type}/{id}/submit/", path(type, id))),
      onSuccess: done,
    }),
    publish: useMutation({
      mutationFn: () => call(api.POST("/api/v1/records/{record_type}/{id}/publish/", path(type, id))),
      onSuccess: done,
    }),
    reject: useMutation({
      mutationFn: (comment: string) =>
        call(api.POST("/api/v1/records/{record_type}/{id}/reject/", { ...path(type, id), body: { comment } })),
      onSuccess: done,
    }),
    archive: useMutation({
      mutationFn: (reason: string) =>
        call(api.POST("/api/v1/records/{record_type}/{id}/archive/", { ...path(type, id), body: { reason } })),
      onSuccess: done,
    }),
  }
}
