import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

import { ApiError, fieldErrors, NON_FIELD, userMessage } from "@/api"

export const ROOT_ERROR = "root.server" as const

/**
 * Rattache les messages d'une erreur de l'API aux champs du formulaire. Un message sur un champ
 * absent du formulaire, ou général, va en tête du formulaire : rien ne se perd. Rend la liste
 * des champs touchés, pour y amener le focus.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): string[] {
  if (!(error instanceof ApiError) || error.status !== 400 || error.code !== "invalid") {
    setError(ROOT_ERROR as Path<T>, { type: "server", message: userMessage(error) })
    return []
  }
  const known = new Set(fields)
  const general: string[] = []
  const touched: string[] = []
  for (const [path, messages] of Object.entries(fieldErrors(error.details))) {
    if (path !== NON_FIELD && known.has(path)) {
      setError(path as Path<T>, { type: "server", message: messages.join(" ") })
      touched.push(path)
    } else {
      const label = path === NON_FIELD ? "" : `${path} : `
      general.push(`${label}${messages.join(" ")}`)
    }
  }
  if (general.length || !touched.length) {
    setError(ROOT_ERROR as Path<T>, {
      type: "server",
      message: general.join(" ") || userMessage(error),
    })
  }
  return touched
}
