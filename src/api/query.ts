import { QueryCache, QueryClient } from "@tanstack/react-query"

import { ApiError, NetworkError } from "./errors"

/**
 * Une erreur du serveur (5xx) ou du réseau peut passer en réessayant ; une erreur de la demande
 * (4xx) ne passera pas. Écritures jamais rejouées automatiquement : validation, calcul et export
 * attendent la réponse du serveur (plan de l'interface, §4.4).
 */
export function shouldRetry(failures: number, error: unknown): boolean {
  if (failures >= 2) return false
  if (error instanceof NetworkError) return true
  return error instanceof ApiError && error.status >= 500
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache(),
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        staleTime: 30_000,
      },
      mutations: { retry: false },
    },
  })
}
