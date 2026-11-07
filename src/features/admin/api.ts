import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, call, type components } from "@/api"

type S = components["schemas"]
export type User = S["User"]
export type Delegation = S["Delegation"]
export type Parameter = S["Parameter"]
export type ParameterValue = S["ParameterValue"]
export type AuditEntry = S["AuditEntry"]

/**
 * Validations qu'une délégation écrite peut confier (plan, §4.3). Le serveur reconnaît
 * `workflow.<parcours>.<étape>` pour les étapes des dossiers et `pricing.*` pour le barème.
 */
export const SCOPE_GROUPS: {
  title: string
  items: { key: string; label: string }[]
}[] = [
  {
    title: "Manifestation d'intérêt",
    items: [
      {
        key: "workflow.ami.validation_exigences",
        label: "Validation de la fiche d'exigences",
      },
      { key: "workflow.ami.go_no_go", label: "Décision Go / No-Go" },
      {
        key: "workflow.ami.validation_technique",
        label: "Validation technique",
      },
      {
        key: "workflow.ami.validation_finale",
        label: "Validation finale et export",
      },
    ],
  },
  {
    title: "Demande de propositions",
    items: [
      {
        key: "workflow.ddp.validation_exigences",
        label: "Validation de la fiche d'exigences",
      },
      { key: "workflow.ddp.go_no_go", label: "Décision Go / No-Go" },
      {
        key: "workflow.ddp.validation_technique",
        label: "Validation technique",
      },
      { key: "workflow.ddp.prix_final", label: "Prix final" },
      {
        key: "workflow.ddp.validation_finale",
        label: "Validation finale et export",
      },
    ],
  },
  {
    title: "Tarification",
    items: [
      { key: "pricing.view", label: "Consulter le barème" },
      { key: "pricing.edit", label: "Modifier le barème" },
    ],
  },
]

const SCOPE_LABEL = new Map(SCOPE_GROUPS.flatMap((group) => group.items.map((item) => [item.key, `${group.title} : ${item.label}`] as const)))
export const scopeLabel = (key: string) => SCOPE_LABEL.get(key) ?? key

export type DelegationState = "active" | "upcoming" | "expired" | "revoked"
export const DELEGATION_STATE_LABEL: Record<DelegationState, string> = {
  active: "En vigueur",
  upcoming: "À venir",
  expired: "Échue",
  revoked: "Révoquée",
}

export function delegationState(delegation: Delegation, now: number): DelegationState {
  if (delegation.revoked_at) return "revoked"
  if (Date.parse(delegation.valid_from) > now) return "upcoming"
  if (Date.parse(delegation.valid_until) <= now) return "expired"
  return "active"
}

/* Comptes */

/** Tous les comptes, pages comprises : le Cabinet en compte quelques dizaines. */
export function useAllUsers() {
  return useQuery({
    queryKey: ["users", "all"],
    queryFn: async () => {
      const users: User[] = []
      for (let page = 1; ; page += 1) {
        const data = await call(api.GET("/api/v1/users/", { params: { query: { page } } }))
        users.push(...data.results)
        if (!data.next) return users
      }
    },
    staleTime: 60_000,
  })
}

export function useUsers(page: number) {
  return useQuery({
    queryKey: ["users", "list", page],
    queryFn: () => call(api.GET("/api/v1/users/", { params: { query: { page } } })),
    placeholderData: keepPreviousData,
  })
}

function useUsersMutation<T>(fn: (values: T) => Promise<unknown>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => client.invalidateQueries({ queryKey: ["users"] }),
  })
}

export const useCreateUser = () => useUsersMutation((body: S["UserCreateRequest"]) => call(api.POST("/api/v1/users/", { body })))

export const useChangeRole = () =>
  useUsersMutation(({ id, role }: { id: string; role: S["UserRoleEnum"] }) =>
    call(
      api.PUT("/api/v1/users/{id}/role/", {
        params: { path: { id } },
        body: { role },
      }),
    ),
  )

export const useDeactivate = () => useUsersMutation((id: string) => call(api.POST("/api/v1/users/{id}/deactivate/", { params: { path: { id } } })))

export const useSetPassword = () =>
  useUsersMutation(({ id, password }: { id: string; password: string }) =>
    call(
      api.POST("/api/v1/users/{id}/password/", {
        params: { path: { id } },
        body: { password },
      }),
    ),
  )

export const useResetOtp = () => useUsersMutation((id: string) => call(api.POST("/api/v1/users/{id}/otp/reset/", { params: { path: { id } } })))

/** Mot de passe provisoire lisible, sans caractères ambigus (0/O, 1/l), 16 caractères. */
export function provisionalPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length])
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12), chars.slice(12)].map((part) => part.join("")).join("-")
}

/* Délégations */

export function useDelegations() {
  return useQuery({
    queryKey: ["delegations", "list"],
    queryFn: async () => {
      const delegations: Delegation[] = []
      for (let page = 1; ; page += 1) {
        const data = await call(api.GET("/api/v1/delegations/", { params: { query: { page } } }))
        delegations.push(...data.results)
        if (!data.next) return delegations
      }
    },
  })
}

export function useCreateDelegation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: S["DelegationRequest"]) => call(api.POST("/api/v1/delegations/", { body })),
    onSuccess: () => client.invalidateQueries({ queryKey: ["delegations"] }),
  })
}

export function useRevokeDelegation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      call(
        api.POST("/api/v1/delegations/{id}/revoke/", {
          params: { path: { id } },
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["delegations"] }),
  })
}

/**
 * Validations confiées en ce moment à la personne connectée par une délégation écrite. Le menu
 * et les écrans s'en servent ; le serveur reste juge à chaque action.
 */
export function useGrants(userId: string | undefined) {
  return useQuery({
    queryKey: ["delegations", "grants", userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const data = await call(api.GET("/api/v1/delegations/", { params: { query: { page: 1 } } }))
      const now = Date.now()
      return data.results.filter((delegation) => delegation.delegate.id === userId && delegationState(delegation, now) === "active").flatMap((delegation) => delegation.scope)
    },
  })
}

/* Paramètres */

export function useParameters() {
  return useQuery({
    queryKey: ["parameters", "list"],
    queryFn: () => call(api.GET("/api/v1/parameters/")),
  })
}

export function useParameterHistory(key: string, enabled: boolean) {
  return useQuery({
    queryKey: ["parameters", "history", key],
    enabled,
    queryFn: () =>
      call(
        api.GET("/api/v1/parameters/{key}/history/", {
          params: { path: { key } },
        }),
      ),
  })
}

export function useSetParameter() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ key, ...body }: { key: string; value: unknown; reason: string; effective_from?: string }) =>
      call(
        api.PUT("/api/v1/parameters/{key}/", {
          params: { path: { key } },
          body,
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["parameters"] }),
  })
}

/* Journal */

export function useAuditEntries(query: Record<string, string | number>) {
  return useQuery({
    queryKey: ["audit", query],
    queryFn: () =>
      call(
        api.GET("/api/v1/audit/entries/", {
          params: { query: query as never },
        }),
      ),
    placeholderData: keepPreviousData,
  })
}
