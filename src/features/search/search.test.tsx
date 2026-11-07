import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderApp } from "@/test/render"
import { fakeServer, json, session } from "@/test/server"

afterEach(() => vi.unstubAllGlobals())

const RESULT = {
  source_type: "document",
  source_id: "d1",
  title: "Attestation de bonne fin KAREGEST",
  kind: "attestation_bonne_fin",
  origin: "backfill",
  proves_facts: true,
  issued_on: "2024-03-12",
  score: 0.8,
  snippet: [
    { text: "Nous soussignés, Cabinet ", match: false },
    { text: "<b>KAREGEST</b>", match: true },
    { text: ", attestons", match: false },
  ],
  sources: [{ document_version_id: "v1", page: 3, document_title: "Attestation" }],
}

describe("recherche", () => {
  it("met en valeur les mots trouvés sans jamais lire le texte comme du HTML, et mène à la page citée", async () => {
    fakeServer({
      "GET /api/v1/auth/session/": json(200, session("collaborateur")),
      "GET /api/v1/search/": json(200, { count: 1, next: null, previous: null, undated_excluded: null, results: [RESULT] }),
    })
    renderApp("/recherche?q=karegest")

    const results = await screen.findByRole("list", { name: "Résultats" })
    expect(within(results).getByText("<b>KAREGEST</b>").tagName).toBe("MARK")
    expect(within(results).getByRole("link", { name: "Attestation de bonne fin KAREGEST" })).toHaveAttribute("href", "/documents/d1?page=3")
    expect(within(results).getByText("Page 3")).toBeInTheDocument()
    expect(within(results).getByText("Attestation de bonne fin")).toBeInTheDocument()
  })

  it("dit qu'un document produit par la plateforme ne prouve rien", async () => {
    fakeServer({
      "GET /api/v1/auth/session/": json(200, session("collaborateur")),
      "GET /api/v1/search/": json(200, { count: 1, next: null, previous: null, undated_excluded: null, results: [{ ...RESULT, proves_facts: false, origin: "platform_generated" }] }),
    })
    renderApp("/recherche?q=karegest")

    expect(await screen.findByText(/ne prouve aucun fait/)).toBeInTheDocument()
  })

  it("dit combien de pièces sans date sont écartées à une date passée", async () => {
    const server = fakeServer({
      "GET /api/v1/auth/session/": json(200, session("collaborateur")),
      "GET /api/v1/search/": json(200, { count: 0, next: null, previous: null, undated_excluded: 4, results: [] }),
    })
    renderApp("/recherche?q=rccm&as_of=2020-01-01")

    expect(await screen.findByText(/4 pièce\(s\) sans date d'émission écartée\(s\)/)).toBeInTheDocument()
    expect(screen.getByText("Aucun résultat pour « rccm »")).toBeInTheDocument()
    const call = server.fetchMock.mock.calls.map(([request]) => (request as Request).url).find((url) => url.includes("/search/"))
    expect(call).toContain("as_of=2020-01-01")
  })

  it("le champ du haut mène à la recherche", async () => {
    fakeServer({
      "GET /api/v1/auth/session/": json(200, session("collaborateur")),
      "GET /api/v1/search/": json(200, { count: 0, next: null, previous: null, undated_excluded: null, results: [] }),
    })
    renderApp("/experts")

    await userEvent.type(await screen.findByLabelText("Rechercher dans la base"), "audit interne{Enter}")

    expect(await screen.findByRole("heading", { name: "Recherche" })).toBeInTheDocument()
    expect(screen.getByText("Aucun résultat pour « audit interne »")).toBeInTheDocument()
  })
})
