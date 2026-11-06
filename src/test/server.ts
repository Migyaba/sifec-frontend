import { vi } from "vitest"

/**
 * Faux serveur pour les tests d'écrans : une réponse par « MÉTHODE chemin ».
 * Une route absente répond 404, pour qu'un appel imprévu se voie.
 */
export type Handler = (request: Request) => Response | Promise<Response>

export function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export function fakeServer(routes: Record<string, Handler | Response>) {
  const calls: string[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(new URL(String(input), "http://sifec.test"), init)
    const key = `${request.method} ${new URL(request.url).pathname}`
    calls.push(key)
    const route = routes[key]
    if (!route) return json(404, { error: { code: "not_found", message: `Route absente du test : ${key}` } })
    return typeof route === "function" ? route(request) : route.clone()
  })
  vi.stubGlobal("fetch", fetchMock)
  return { calls, fetchMock }
}

export const USERS = {
  chef_pole: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "pole@sifec.test",
    first_name: "Aurel",
    last_name: "Kpadonou",
    full_name: "Aurel Kpadonou",
    role: "chef_pole",
    is_active: true,
  },
  admin_technique: {
    id: "00000000-0000-0000-0000-000000000002",
    email: "admin@sifec.test",
    first_name: "",
    last_name: "",
    full_name: "",
    role: "admin_technique",
    is_active: true,
  },
  collaborateur: {
    id: "00000000-0000-0000-0000-000000000003",
    email: "collab@sifec.test",
    first_name: "Fifa",
    last_name: "Houngbo",
    full_name: "Fifa Houngbo",
    role: "collaborateur",
    is_active: true,
  },
} as const

export function session(user: keyof typeof USERS, otp: Partial<{ required: boolean; enrolled: boolean; verified: boolean }> = {}) {
  return {
    user: USERS[user],
    otp_required: otp.required ?? false,
    otp_enrolled: otp.enrolled ?? false,
    otp_verified: otp.verified ?? false,
  }
}

export const UNAUTHENTICATED = json(401, { error: { code: "not_authenticated", message: "Connexion requise" } })
