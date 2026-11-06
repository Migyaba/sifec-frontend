import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { call, createApi, onUnauthorized, readCookie } from "./client"
import { ApiError, NetworkError } from "./errors"

const ORIGIN = "http://sifec.test"

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

function setCookie(value: string) {
  document.cookie = `csrftoken=${value}; path=/`
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  setCookie("jeton-1")
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const requestOf = (index: number) => fetchMock.mock.calls[index][0] as Request

describe("readCookie", () => {
  it("lit un cookie parmi d'autres", () => {
    expect(readCookie("csrftoken", "sessionid=abc; csrftoken=x%3Dy; autre=1")).toBe("x=y")
    expect(readCookie("absent", "a=1")).toBeNull()
  })
})

describe("client de l'API", () => {
  it("n'ajoute pas le jeton CSRF à une lecture", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { count: 0, results: [] }))

    await call(createApi(ORIGIN).GET("/api/v1/experts/"))

    expect(requestOf(0).headers.get("X-CSRFToken")).toBeNull()
  })

  it("ajoute le jeton CSRF du cookie à une écriture", async () => {
    fetchMock.mockResolvedValueOnce(json(200, {}))

    await createApi(ORIGIN).POST("/api/v1/auth/logout/")

    expect(requestOf(0).headers.get("X-CSRFToken")).toBe("jeton-1")
  })

  it("reprend le jeton et rejoue une fois l'écriture refusée pour CSRF", async () => {
    fetchMock
      .mockResolvedValueOnce(json(403, { error: { code: "csrf_failed", message: "CSRF Failed" } }))
      .mockImplementationOnce(async () => {
        setCookie("jeton-2")
        return new Response(null, { status: 200 })
      })
      .mockResolvedValueOnce(json(200, {}))

    const { response } = await createApi(ORIGIN).POST("/api/v1/auth/logout/")

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/v1/auth/csrf/")
    expect(requestOf(2).headers.get("X-CSRFToken")).toBe("jeton-2")
  })

  it("ne rejoue pas un autre refus", async () => {
    fetchMock.mockResolvedValueOnce(json(403, { error: { code: "permission_denied", message: "Refusé." } }))

    const failure = call(createApi(ORIGIN).POST("/api/v1/auth/logout/"))

    await expect(failure).rejects.toMatchObject({ status: 403, code: "permission_denied" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("prévient l'application d'une session expirée", async () => {
    const listener = vi.fn()
    const stop = onUnauthorized(listener)
    fetchMock.mockResolvedValueOnce(json(401, { error: { code: "not_authenticated", message: "Connexion requise" } }))

    await expect(call(createApi(ORIGIN).GET("/api/v1/auth/session/"))).rejects.toBeInstanceOf(ApiError)

    expect(listener).toHaveBeenCalledOnce()
    stop()
  })

  it("distingue une coupure du réseau d'une erreur du serveur", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))

    await expect(call(createApi(ORIGIN).GET("/api/v1/experts/"))).rejects.toBeInstanceOf(NetworkError)
  })

  it("rend les messages par champ d'une 400", async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, { error: { code: "invalid", message: "Non valide.", details: { email: ["Requis."] } } }),
    )

    const failure = call(createApi(ORIGIN).POST("/api/v1/auth/login/", { body: { email: "", password: "x" } }))

    await expect(failure).rejects.toMatchObject({ status: 400, details: { email: ["Requis."] } })
  })
})
