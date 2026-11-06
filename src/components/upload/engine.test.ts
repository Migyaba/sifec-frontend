import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { json } from "@/test/server"

import { sendFile, startSession, UploadError } from "./engine"

const STORAGE = "https://stockage.test/bucket/objet"

type Route = (request: Request) => Response | Promise<Response>

function server(routes: { start?: Route; part: Route; complete?: Route; resume?: Route }) {
  const calls: { method: string; url: string; body?: unknown }[] = []
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(String(input), init)
    const url = new URL(request.url)
    const body = request.method === "POST" ? await request.clone().json().catch(() => undefined) : undefined
    calls.push({ method: request.method, url: url.pathname + url.search, body })
    if (url.origin === new URL(STORAGE).origin) return routes.part(request)
    if (url.pathname === "/api/v1/auth/csrf/") return json(200)
    if (url.pathname === "/api/v1/documents/uploads/") return (routes.start ?? (() => json(500)))(request)
    if (url.pathname.endsWith("/complete/")) return (routes.complete ?? (() => json(201, { id: "v1", status: "pending" })))(request)
    if (url.pathname.endsWith("/parts/")) return (routes.resume ?? (() => json(500)))(request)
    return json(404)
  })
  vi.stubGlobal("fetch", mock)
  return calls
}

const opened = () =>
  json(201, {
    id: "s1",
    part_size: 4,
    parts: [
      { number: 1, url: `${STORAGE}?partNumber=1` },
      { number: 2, url: `${STORAGE}?partNumber=2` },
    ],
  })

const etag = (request: Request) =>
  new Response(null, { status: 200, headers: { ETag: `"etag-${new URL(request.url).searchParams.get("partNumber")}"` } })

const file = () => new File(["abcdef"], "Attestation fiscale.pdf", { type: "application/pdf" })

beforeEach(() => {
  document.cookie = "csrftoken=jeton; path=/"
})
afterEach(() => vi.unstubAllGlobals())

describe("dépôt par morceaux", () => {
  it("envoie chaque morceau au stockage puis termine avec les ETags dans l'ordre", async () => {
    const calls = server({ start: opened, part: etag })
    const progress: number[] = []

    const session = await startSession(file())
    const version = await sendFile(file(), session, { onProgress: (sent) => progress.push(sent), retryDelays: [] })

    expect(version).toMatchObject({ id: "v1" })
    expect(calls[0]).toMatchObject({ body: { filename: "Attestation fiscale.pdf", size: 6, content_type: "application/pdf" } })
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(2)
    const complete = calls.find((c) => c.url.endsWith("/complete/"))
    expect(complete?.body).toEqual({ parts: [{ number: 1, etag: '"etag-1"' }, { number: 2, etag: '"etag-2"' }] })
    expect(progress.at(-1)).toBe(6)
  })

  it("réessaie un morceau après une coupure passagère", async () => {
    let failures = 1
    server({
      start: opened,
      part: (request) => {
        if (new URL(request.url).searchParams.get("partNumber") === "1" && failures-- > 0) throw new TypeError("Failed to fetch")
        return etag(request)
      },
    })

    const session = await startSession(file())
    await expect(sendFile(file(), session, { retryDelays: [0] })).resolves.toMatchObject({ id: "v1" })
  })

  it("se met en pause après une coupure durable, puis reprend sans renvoyer ce qui est reçu", async () => {
    let online = false
    const calls = server({
      start: opened,
      part: (request) => {
        if (new URL(request.url).searchParams.get("partNumber") === "2" && !online) throw new TypeError("Failed to fetch")
        return etag(request)
      },
      resume: () => json(200, [{ number: 2, url: `${STORAGE}?partNumber=2&nouvelle=1` }]),
    })
    const session = await startSession(file())

    const paused = await sendFile(file(), session, { retryDelays: [0] }).catch((error) => error)
    expect(paused).toBeInstanceOf(UploadError)
    expect(paused.resumable).toBe(true)

    online = true
    const before = calls.filter((c) => c.method === "PUT").length
    await expect(sendFile(file(), session, { retryDelays: [] })).resolves.toMatchObject({ id: "v1" })

    expect(calls.find((c) => c.url.endsWith("/parts/"))?.body).toEqual({ numbers: [2] })
    const resent = calls.filter((c) => c.method === "PUT").slice(before)
    expect(resent.map((c) => c.url)).toEqual(["/bucket/objet?partNumber=2&nouvelle=1"])
  })

  it("s'arrête net si le stockage cache l'ETag : c'est sa configuration, pas une coupure", async () => {
    server({ start: opened, part: () => new Response(null, { status: 200 }) })
    const session = await startSession(file())

    const failure = await sendFile(file(), session, { retryDelays: [0, 0] }).catch((error) => error)

    expect(failure).toMatchObject({ resumable: false })
    expect(failure.message).toContain("CORS")
  })

  it("rapporte le motif d'un fichier refusé par le serveur", async () => {
    server({
      start: () => json(400, { error: { code: "invalid", message: "Non valide.", details: { size: ["Fichier trop volumineux."] } } }),
      part: etag,
    })

    await expect(startSession(file())).rejects.toBeInstanceOf(Error)
    const failure = await startSession(file()).catch((error) => error)
    const { asUploadError } = await import("./engine")
    expect(asUploadError(failure)).toMatchObject({ resumable: false, message: "Fichier trop volumineux." })
  })
})
