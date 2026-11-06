import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, call, type components } from "@/api"

type S = components["schemas"]
export type Expert = S["Expert"]
export type ExpertInput = S["ExpertRequest"]
export type Employment = S["EmploymentEnum"]

export const EMPLOYMENT_LABEL: Record<Employment, string> = {
  employee: "Salarié",
  partner: "Associé",
  external: "Consultant externe",
}

export const expertKeys = {
  all: ["experts"] as const,
  list: (query: Record<string, unknown>) => ["experts", "list", query] as const,
  detail: (id: string) => ["experts", "detail", id] as const,
}

export function useExperts(query: Record<string, string | number>) {
  return useQuery({
    queryKey: expertKeys.list(query),
    queryFn: () => call(api.GET("/api/v1/experts/", { params: { query: query as never } })),
    placeholderData: keepPreviousData,
  })
}

export function useExpert(id: string | undefined) {
  return useQuery({
    queryKey: expertKeys.detail(id ?? ""),
    queryFn: () => call(api.GET("/api/v1/experts/{id}/", { params: { path: { id: id as string } } })),
    enabled: Boolean(id),
  })
}

/** Organisations qui peuvent porter un expert : le Cabinet et ses partenaires. */
export function useEntities() {
  return useQuery({
    queryKey: ["organizations", "entities"],
    queryFn: () => call(api.GET("/api/v1/organizations/", { params: { query: { entity: true } } })),
    staleTime: 10 * 60_000,
  })
}

export function useSaveExpert(id: string | undefined) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (values: Partial<ExpertInput>) =>
      id
        ? call(api.PATCH("/api/v1/experts/{id}/", { params: { path: { id } }, body: values }))
        : call(api.POST("/api/v1/experts/", { body: values as ExpertInput })),
    onSuccess: (expert) => {
      client.setQueryData(expertKeys.detail(expert.id), expert)
      void client.invalidateQueries({ queryKey: expertKeys.all })
      // Une modification ramène la fiche au brouillon : la confiance et les preuves sont relues.
      void client.invalidateQueries({ predicate: (query) => query.queryKey.includes(expert.id) })
    },
  })
}

/** Libellés des champs, pour le formulaire et pour les erreurs de publication. */
export const FIELD_LABEL: Record<string, string> = {
  entity: "Organisation",
  employment: "Statut",
  last_name: "Nom",
  first_name: "Prénoms",
  title: "Titre ou profession",
  birth_date: "Date de naissance",
  nationality: "Nationalité",
  email: "Courriel",
  phone: "Téléphone",
  cv_date: "Date du CV",
  summary: "Profil",
}

/** Années d'expérience, accord pour le CV et ancienneté du CV, calculés par le serveur. */
export function useExpertSummary(id: string) {
  return useQuery({
    queryKey: ["experts", "summary", id],
    queryFn: () => call(api.GET("/api/v1/experts/{id}/summary/", { params: { path: { id } } })),
  })
}

export function useConsents(id: string) {
  return useQuery({
    queryKey: ["experts", "consents", id],
    queryFn: () => call(api.GET("/api/v1/experts/{id}/consents/", { params: { path: { id } } })),
  })
}

export function useConsentMutations(id: string) {
  const client = useQueryClient()
  const done = () => client.invalidateQueries({ predicate: (query) => query.queryKey.includes(id) })
  return {
    add: useMutation({
      mutationFn: (body: S["CvConsentCreateRequest"]) =>
        call(api.POST("/api/v1/experts/{id}/consents/", { params: { path: { id } }, body })),
      onSuccess: done,
    }),
    withdraw: useMutation({
      mutationFn: ({ consentId, ...body }: S["CvConsentWithdrawRequest"] & { consentId: string }) =>
        call(api.POST("/api/v1/experts/{id}/consents/{consent_id}/withdraw/", { params: { path: { id, consent_id: consentId } }, body })),
      onSuccess: done,
    }),
  }
}
