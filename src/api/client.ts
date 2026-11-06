/**
 * Client de l'API, typé par le schéma OpenAPI du backend (`npm run api`).
 *
 * Session Django par cookie, même origine (guide de l'API, « Connexion ») :
 * - toute écriture porte l'en-tête X-CSRFToken, relu dans le cookie à chaque requête ;
 * - un refus `csrf_failed` reprend le jeton et rejoue la requête une fois, sans déconnecter ;
 * - un 401 prévient l'application, qui renvoie vers la connexion.
 */
import createClient, { type Middleware } from "openapi-fetch"

import { ApiError, NetworkError } from "./errors"
import type { paths } from "./schema"

const CSRF_COOKIE = "csrftoken"
const CSRF_HEADER = "X-CSRFToken"
const CSRF_URL = "/api/v1/auth/csrf/"
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"])

export function readCookie(name: string, cookies: string = document.cookie): string | null {
  for (const part of cookies.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

let pending: Promise<void> | null = null

/** Dépose le cookie CSRF. Les appels simultanés partagent la même requête. */
export function fetchCsrf(): Promise<void> {
  pending ??= globalThis
    .fetch(CSRF_URL, { credentials: "same-origin" })
    .then(() => undefined)
    .finally(() => {
      pending = null
    })
  return pending
}

async function csrfToken(): Promise<string | null> {
  const token = readCookie(CSRF_COOKIE)
  if (token) return token
  await fetchCsrf()
  return readCookie(CSRF_COOKIE)
}

type Listener = (url: string) => void
const unauthorizedListeners = new Set<Listener>()

/** L'application s'abonne pour renvoyer vers la page de connexion ; elle reçoit l'adresse refusée. */
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

// Copies des écritures, pour pouvoir les rejouer après un refus CSRF.
const replayable = new Map<string, Request>()

const session: Middleware = {
  async onRequest({ request, id }) {
    if (SAFE_METHODS.has(request.method)) return request
    const token = await csrfToken()
    if (token) request.headers.set(CSRF_HEADER, token)
    replayable.set(id, request.clone())
    return request
  },
  async onResponse({ request, response, id }) {
    const original = replayable.get(id)
    replayable.delete(id)
    if (response.status === 401) {
      unauthorizedListeners.forEach((listener) => listener(request.url))
      return response
    }
    if (response.status !== 403 || !original) return response
    const body = await response.clone().json().catch(() => null)
    if (body?.error?.code !== "csrf_failed") return response
    await fetchCsrf()
    const token = readCookie(CSRF_COOKIE)
    if (token) original.headers.set(CSRF_HEADER, token)
    return globalThis.fetch(original)
  },
  onError({ id }) {
    replayable.delete(id)
  },
}

/** Par défaut, l'origine de la page : l'API est servie à la même origine que l'interface. */
export function createApi(baseUrl: string = globalThis.location?.origin ?? "") {
  const client = createClient<paths>({
    baseUrl,
    credentials: "same-origin",
    // Lu à chaque appel : les tests peuvent remplacer fetch.
    fetch: (request) => globalThis.fetch(request),
  })
  client.use(session)
  return client
}

export const api = createApi()

type Result<T> = { data?: T; error?: unknown; response: Response }

/**
 * Donne les données d'un appel, ou lève une `ApiError` ou une `NetworkError`.
 * À utiliser dans les requêtes et mutations de TanStack Query.
 */
export async function call<T>(promise: Promise<Result<T>>): Promise<T> {
  let result: Result<T>
  try {
    result = await promise
  } catch (cause) {
    throw new NetworkError(cause)
  }
  if (result.error !== undefined || !result.response.ok) {
    throw ApiError.from(result.response.status, result.error)
  }
  return result.data as T
}
