import { ApiError, fieldErrors, userMessage } from "@/api"

/** Refus du serveur, dans ses mots : messages par champ, sinon message général. */
export function messageOf(error: unknown): string {
  if (error instanceof ApiError && error.code === "invalid") return Object.values(fieldErrors(error.details)).flat().join(" ") || userMessage(error)
  return userMessage(error)
}
