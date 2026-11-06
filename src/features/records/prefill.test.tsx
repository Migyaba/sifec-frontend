import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fakeServer, json } from "@/test/server"

import { LastPrefill, summaryOf } from "./components/Prefill"

afterEach(() => vi.unstubAllGlobals())

function show(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("préremplissage", () => {
  it("résume ce que l'IA a rempli, et rappelle que tout reste à vérifier", () => {
    expect(summaryOf({ filled: ["last_name", "cv_date"], items: { degrees: 1, experiences: 2 }, evidence: { cv_date: 1 } })).toBe(
      "2 champ(s) rempli(s), 3 élément(s) ajouté(s), 1 preuve(s) rattachée(s). Tout reste à vérifier par une autre personne.",
    )
  })

  it("montre le dernier compte rendu, avec les valeurs écartées et leur raison", async () => {
    fakeServer({
      "GET /api/v1/records/expert/e1/prefill-runs/": json(200, [
        {
          id: "r1",
          record_type: "expert",
          record_id: "e1",
          document_version: "v1",
          defaults: {},
          status: "succeeded",
          error: "",
          report: {
            filled: ["cv_date"],
            skipped: [{ field: "nationality", value: "Béninoise", reason: "déjà renseigné" }],
            items: {},
            evidence: { cv_date: 1 },
          },
          created_at: "2026-11-06T10:00:00Z",
          finished_at: "2026-11-06T10:01:00Z",
        },
      ]),
    })
    show(<LastPrefill recordType="expert" recordId="e1" fieldLabel={(field) => ({ cv_date: "Date du CV", nationality: "Nationalité" })[field] ?? field} />)

    expect(await screen.findByText(/1 champ\(s\) rempli\(s\)/)).toBeInTheDocument()
    expect(screen.getByText("Remplis : Date du CV.")).toBeInTheDocument()
    expect(screen.getByText("1 valeur(s) écartée(s)")).toBeInTheDocument()
    expect(screen.getByText(/Nationalité \(« Béninoise »\) : déjà renseigné/)).toBeInTheDocument()
  })

  it("dit pourquoi un préremplissage a échoué", async () => {
    fakeServer({
      "GET /api/v1/records/expert/e1/prefill-runs/": json(200, [
        { id: "r1", record_type: "expert", record_id: "e1", document_version: "v1", defaults: {}, status: "failed", error: "La pièce ne contient aucun texte lisible.", report: {}, created_at: "2026-11-06T10:00:00Z", finished_at: null },
      ]),
    })
    show(<LastPrefill recordType="expert" recordId="e1" fieldLabel={(field) => field} />)

    expect(await screen.findByText("La pièce ne contient aucun texte lisible.")).toBeInTheDocument()
  })
})
