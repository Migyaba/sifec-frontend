import { ApiError, fieldErrors, userMessage } from "@/api"

/**
 * Refus du serveur, dans ses mots et point par point : ce qui manque pour terminer une étape,
 * le point qui reste à trancher, la règle des quatre yeux.
 */
export function problemsOf(error: unknown): string[] {
  if (error instanceof ApiError && error.code === "invalid") {
    const found = Object.values(fieldErrors(error.details)).flat()
    if (found.length) return found
  }
  return [userMessage(error)]
}
