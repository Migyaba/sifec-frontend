import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderApp } from "@/test/render"
import { fakeServer, json, session } from "@/test/server"

afterEach(() => vi.unstubAllGlobals())

const version = (changes: Record<string, unknown> = {}) => ({
  id: "v1",
  document: "d1",
  number: 1,
  original_filename: "RCCM 2025.pdf",
  original_path: "",
  status: "ready",
  error: "",
  file_format: "pdf",
  size: 245_000,
  text_source: "ocr",
  legibility: "check",
  legibility_score: "0.640",
  page_count: 2,
  origin: "external",
  duplicate_of: null,
  near_duplicate_of: null,
  created_at: "2026-11-06T10:00:00Z",
  processed_at: "2026-11-06T10:01:00Z",
  issued_on: null,
  ...changes,
})

const doc = (changes: Record<string, unknown> = {}) => ({
  id: "d1",
  title: "RCCM 2025",
  kind: "piece_juridique",
  kind_source: "rule",
  archived: false,
  current_version: version(),
  created_at: "2026-11-06T10:00:00Z",
  ...changes,
})

describe("liste des documents", () => {
  it("montre une pièce pas encore lue, sans version courante, sans planter", async () => {
    fakeServer({
      "GET /api/v1/auth/session/": json(200, session("collaborateur")),
      "GET /api/v1/documents/": json(200, {
        count: 2,
        next: null,
        previous: null,
        results: [doc(), doc({ id: "d2", title: "Avis DDP 014", kind: "avis", current_version: null })],
      }),
    })
    renderApp("/documents")

    const pending = await screen.findByRole("row", { name: /Avis DDP 014/ })
    expect(within(pending).getByText("En attente")).toBeInTheDocument()
    const read = screen.getByRole("row", { name: /RCCM 2025/ })
    expect(within(read).getByText("À vérifier")).toBeInTheDocument()
    expect(within(read).getByText("Pièce juridique (RCCM, statuts, OECCA)")).toBeInTheDocument()
  })

  it("envoie la recherche et les filtres à l'API", async () => {
    const server = fakeServer({
      "GET /api/v1/auth/session/": json(200, session("collaborateur")),
      "GET /api/v1/documents/": json(200, { count: 0, next: null, previous: null, results: [] }),
    })
    renderApp("/documents?kind=cv")

    expect(await screen.findByText("Aucun document ne correspond")).toBeInTheDocument()
    const listCall = server.fetchMock.mock.calls.map(([request]) => (request as Request).url).find((url) => url.includes("/documents/"))
    expect(listCall).toContain("kind=cv")
  })

  it("invite à déposer quand la base est vide", async () => {
    fakeServer({
      "GET /api/v1/auth/session/": json(200, session("collaborateur")),
      "GET /api/v1/documents/": json(200, { count: 0, next: null, previous: null, results: [] }),
    })
    renderApp("/documents")

    expect(await screen.findByText("La base ne contient encore aucun document")).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole("button", { name: "Déposer des documents" }).at(-1) as HTMLElement)
    expect(screen.getByRole("region", { name: "Dépôt de documents" })).toBeInTheDocument()
  })
})

describe("fiche d'un document", () => {
  it("lit le texte brut des pages, sans jamais l'interpréter", async () => {
    fakeServer({
      "GET /api/v1/auth/session/": json(200, session("collaborateur")),
      "GET /api/v1/documents/d1/": json(200, { ...doc(), versions: [version()] }),
      "GET /api/v1/documents/versions/v1/pages/": json(200, {
        count: 2,
        next: null,
        previous: null,
        results: [
          { number: 1, text: "<b>RCCM</b> RB/COT/00 B 0000", source: "ocr", legibility: "check", legibility_score: "0.600" },
          { number: 2, text: "Page deux", source: "ocr", legibility: "good", legibility_score: "0.900" },
        ],
      }),
    })
    renderApp("/documents/d1")

    expect(await screen.findByText("<b>RCCM</b> RB/COT/00 B 0000")).toBeInTheDocument()
    expect(screen.getByText("Lisibilité à vérifier")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Page suivante" }))
    expect(screen.getByText("Page deux")).toBeInTheDocument()
  })

  it("montre la première version en lecture quand aucune n'est encore lue", async () => {
    fakeServer({
      "GET /api/v1/auth/session/": json(200, session("collaborateur")),
      "GET /api/v1/documents/d1/": json(200, {
        ...doc({ current_version: null }),
        versions: [version({ status: "processing", page_count: 0, legibility: "unknown" })],
      }),
    })
    renderApp("/documents/d1")

    expect(await screen.findByRole("heading", { level: 1, name: "RCCM 2025" })).toBeInTheDocument()
    expect(screen.getAllByText("En cours de traitement").length).toBeGreaterThan(0)
  })

  it("rappelle qu'un document produit par la plateforme ne prouve rien", async () => {
    fakeServer({
      "GET /api/v1/auth/session/": json(200, session("collaborateur")),
      "GET /api/v1/documents/d1/": json(200, {
        ...doc({ current_version: version({ origin: "platform_generated", legibility: "good" }) }),
        versions: [version({ origin: "platform_generated", legibility: "good" })],
      }),
      "GET /api/v1/documents/versions/v1/pages/": json(200, { count: 0, next: null, previous: null, results: [] }),
    })
    renderApp("/documents/d1")

    expect(await screen.findByText(/il ne prouve aucun fait/)).toBeInTheDocument()
  })
})
