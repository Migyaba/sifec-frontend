/**
 * Erreurs de l'API (guide de l'API, « Erreurs »). Toute réponse en erreur a la forme
 * {"error": {"code", "message", "details"}} ; `details` porte les messages par champ d'une 400.
 */

export type ErrorBody = {
  error: { code: string; message: string; details?: unknown }
}

export function isErrorBody(value: unknown): value is ErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false
  const error = (value as { error: unknown }).error
  return typeof error === "object" && error !== null && "code" in error && "message" in error
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details ?? null
  }

  static from(status: number, body: unknown): ApiError {
    if (isErrorBody(body)) {
      return new ApiError(status, body.error.code, body.error.message, body.error.details)
    }
    return new ApiError(status, "unexpected", "Réponse inattendue du serveur.")
  }
}

/** Le serveur n'a pas répondu : coupure du réseau, serveur arrêté. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super("Le serveur ne répond pas.", { cause })
    this.name = "NetworkError"
  }
}

export const NON_FIELD = "non_field_errors"

/**
 * Messages par champ d'une erreur 400, à plat. Un élément de liste s'adresse comme dans l'API :
 * `experiences.0.employer`. Les erreurs générales sont sous `non_field_errors`.
 */
export function fieldErrors(details: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const add = (path: string, message: string) => {
    ;(out[path || NON_FIELD] ??= []).push(message)
  }
  const walk = (value: unknown, path: string) => {
    if (typeof value === "string") add(path, value)
    else if (Array.isArray(value)) {
      if (value.every((item) => typeof item === "string")) value.forEach((item) => add(path, item))
      else value.forEach((item, index) => walk(item, path ? `${path}.${index}` : String(index)))
    } else if (typeof value === "object" && value !== null) {
      for (const [key, item] of Object.entries(value)) {
        walk(item, key === NON_FIELD ? path : path ? `${path}.${key}` : key)
      }
    }
  }
  walk(details, "")
  return out
}

/** Ce que l'interface dit à la personne, quand l'écran n'a rien de plus précis à dire. */
export function userMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return "Le serveur ne répond pas. Vérifiez la connexion, puis réessayez : rien n'a été perdu."
  }
  if (!(error instanceof ApiError)) return "Une erreur inattendue s'est produite. Réessayez."
  switch (error.status) {
    case 400:
      return "Certaines valeurs sont à corriger."
    case 401:
      return "Votre session a expiré. Reconnectez-vous pour continuer."
    case 403:
      return "Vous n'avez pas accès à cette action."
    case 404:
      return "Cet élément est introuvable, ou vous n'y avez pas accès."
    case 409:
      return error.message
    case 429:
      return "Trop de tentatives. Patientez quelques minutes avant de réessayer."
    default:
      return error.status >= 500
        ? "Le serveur a rencontré une erreur. Réessayez ; si elle persiste, prévenez l'administrateur."
        : error.message
  }
}
