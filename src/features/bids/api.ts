import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, ApiError, call, type components } from "@/api"

type S = components["schemas"]
export type Bid = S["Bid"]
export type BidStatus = S["BidStatusEnum"]
export type Member = S["BidMember"]
export type MemberRole = S["BidMemberRoleEnum"]
export type Partner = S["BidPartner"]
export type PartnerRole = S["BidPartnerRoleEnum"]
export type Step = S["Step"]
export type Decision = S["Validation"]
export type CriterionResult = S["CriterionResultEnum"]

/** Ligne du tableau Go / No-Go : constat de la plateforme, et appréciation humaine à côté. */
export type Criterion = {
  key: string
  label: string
  result: CriterionResult
  detail: string
  manual_result: CriterionResult | null
  manual_note: string
  manual_by: string | null
}

export const bidKeys = {
  all: ["bids"] as const,
  list: (query: Record<string, string | number>) => ["bids", "list", query] as const,
  detail: (id: string) => ["bids", "detail", id] as const,
  part: (id: string, part: string) => ["bids", "detail", id, part] as const,
}

export function useBids(query: Record<string, string | number>, enabled = true) {
  return useQuery({
    queryKey: bidKeys.list(query),
    queryFn: () => call(api.GET("/api/v1/bids/", { params: { query: query as never } })),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useBid(id: string) {
  return useQuery({ queryKey: bidKeys.detail(id), queryFn: () => call(api.GET("/api/v1/bids/{id}/", { params: { path: { id } } })) })
}

export function useCreateBid() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: S["BidRequest"]) => call(api.POST("/api/v1/bids/", { body })),
    onSuccess: () => client.invalidateQueries({ queryKey: bidKeys.all }),
  })
}

const path = (id: string) => ({ params: { path: { id } } })

/**
 * Parcours et empreintes de ce qui est à valider. Toujours relu à l'affichage : l'avis ou les
 * contenus ont pu changer ailleurs, et une validation ne porte que sur ce qui est affiché.
 */
export function useSteps(id: string) {
  return useQuery({ queryKey: bidKeys.part(id, "steps"), queryFn: () => call(api.GET("/api/v1/bids/{id}/steps/", path(id))), staleTime: 0 })
}

export function useMembers(id: string) {
  return useQuery({ queryKey: bidKeys.part(id, "members"), queryFn: () => call(api.GET("/api/v1/bids/{id}/members/", path(id))) })
}

export function usePartners(id: string) {
  return useQuery({ queryKey: bidKeys.part(id, "partners"), queryFn: () => call(api.GET("/api/v1/bids/{id}/partners/", path(id))) })
}

export function useDecisions(id: string) {
  return useQuery({ queryKey: bidKeys.part(id, "validations"), queryFn: () => call(api.GET("/api/v1/bids/{id}/validations/", path(id))) })
}

/** Tableau Go / No-Go, ou `null` tant qu'il n'est pas établi (à la validation de la fiche). */
export function useAssessment(id: string, enabled: boolean) {
  return useQuery({
    queryKey: bidKeys.part(id, "go-no-go"),
    enabled,
    queryFn: async () => {
      try {
        const data = await call(api.GET("/api/v1/bids/{id}/go-no-go/", path(id)))
        return { criteria: data.criteria as Criterion[], evaluated_at: data.evaluated_at }
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
  })
}

/**
 * Une action sur le dossier change le parcours, ses empreintes et souvent la liste : tout le
 * dossier est relu, ainsi que le tableau de bord qui compte les validations.
 */
function useBidMutation<T, R>(fn: (values: T) => Promise<R>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      void client.invalidateQueries({ queryKey: bidKeys.all })
      void client.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export const useValidateStep = (id: string) =>
  useBidMutation(({ step, seen, comment }: { step: string; seen: Record<string, string>; comment: string }) =>
    call(api.POST("/api/v1/bids/{id}/steps/{step}/validate/", { params: { path: { id, step } }, body: { seen, comment } })),
  )

export const useRejectStep = (id: string) =>
  useBidMutation(({ step, comment }: { step: string; comment: string }) =>
    call(api.POST("/api/v1/bids/{id}/steps/{step}/reject/", { params: { path: { id, step } }, body: { comment } })),
  )

export const useCompleteStep = (id: string) =>
  useBidMutation((step: string) => call(api.POST("/api/v1/bids/{id}/steps/{step}/complete/", { params: { path: { id, step } } })))

export const useEvaluate = (id: string) => useBidMutation(() => call(api.POST("/api/v1/bids/{id}/go-no-go/", path(id))))

export const useSetCriterion = (id: string) =>
  useBidMutation((body: { key: string; result: CriterionResult; note: string }) => call(api.POST("/api/v1/bids/{id}/go-no-go/criterion/", { ...path(id), body })))

export const useAddMember = (id: string) =>
  useBidMutation((body: { user: string; role: MemberRole }) => call(api.POST("/api/v1/bids/{id}/members/", { ...path(id), body })))

export const useRemoveMember = (id: string) =>
  useBidMutation((member: string) => call(api.DELETE("/api/v1/bids/{id}/members/{member_id}/", { params: { path: { id, member_id: member } } })))

export const useAddPartner = (id: string) =>
  useBidMutation((body: { organization: string; role: PartnerRole }) => call(api.POST("/api/v1/bids/{id}/partners/", { ...path(id), body })))

/** Fiche d'exigences en vigueur de l'avis : la validation du chef de pôle porte sur elle. */
export function useCurrentSheet(tenderId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["tenders", "sheets", tenderId],
    enabled,
    queryFn: () => call(api.GET("/api/v1/tenders/{id}/sheets/", { params: { path: { id: tenderId } } })),
    select: (sheets) => sheets.find((sheet) => sheet.status === "ready") ?? null,
  })
}

/** Ce qui attend la personne connectée : le tableau de bord le calcule, avec les délégations. */
export function useWaitingValidations() {
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => call(api.GET("/api/v1/dashboard/")),
    select: (overview) => overview.validations,
  })
}
