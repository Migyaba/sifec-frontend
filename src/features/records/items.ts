import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, call } from "@/api"

import { invalidateRecord } from "./api"

/**
 * Éléments d'une liste de fiche (expériences, diplômes…) : même forme d'API pour toutes les
 * listes de tous les types, `{base}/{record_pk}/{collection}/` et `…/{id}/`. Le client typé ne
 * sait pas écrire ce chemin générique : les types de chaque liste sont donnés par l'écran.
 */
export type ItemRow = { id: string; position?: number } & Record<string, unknown>

type Untyped = {
  GET: (path: string, init: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>
  POST: (path: string, init: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>
  PATCH: (path: string, init: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>
  DELETE: (path: string, init: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>
}
const loose = api as unknown as Untyped

export const itemKeys = {
  list: (base: string, recordId: string, collection: string) => ["records", base, recordId, "items", collection] as const,
}

export function useItems<T extends ItemRow>(base: string, recordId: string, collection: string) {
  return useQuery({
    queryKey: itemKeys.list(base, recordId, collection),
    queryFn: () => call(loose.GET(`${base}/{record_pk}/${collection}/`, { params: { path: { record_pk: recordId } } })) as Promise<T[]>,
  })
}

/** Ajouter, modifier ou retirer un élément ramène la fiche au brouillon : tout est relu. */
export function useItemMutations(base: string, recordId: string, collection: string) {
  const client = useQueryClient()
  const done = () => invalidateRecord(client, recordId)
  return {
    create: useMutation({
      mutationFn: (body: Record<string, unknown>) =>
        call(loose.POST(`${base}/{record_pk}/${collection}/`, { params: { path: { record_pk: recordId } }, body })),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
        call(loose.PATCH(`${base}/{record_pk}/${collection}/{id}/`, { params: { path: { record_pk: recordId, id } }, body })),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: (id: string) =>
        call(loose.DELETE(`${base}/{record_pk}/${collection}/{id}/`, { params: { path: { record_pk: recordId, id } } })),
      onSuccess: done,
    }),
  }
}
