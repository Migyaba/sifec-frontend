import { useQuery } from "@tanstack/react-query"

import { api, call } from "@/api"

export const sessionKey = ["auth", "session"] as const

/** Session en cours : utilisateur, rôle, et état de la double authentification. */
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: () => call(api.GET("/api/v1/auth/session/")),
    retry: false,
    staleTime: 5 * 60_000,
  })
}
