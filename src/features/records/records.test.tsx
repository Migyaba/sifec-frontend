import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ConfirmProvider } from "@/components/confirm"
import { fakeServer, json } from "@/test/server"

import { ProofPanel, ReviewBar, type RecordBase } from "."

afterEach(() => vi.unstubAllGlobals())

const ME = "00000000-0000-0000-0000-000000000001"
const OTHER = "00000000-0000-0000-0000-000000000009"
const BASE = "/api/v1/records/expert/e1"

function record(changes: Partial<RecordBase> = {}): RecordBase {
  return {
    id: "e1",
    status: "to_verify",
    contributors: [OTHER],
    published_number: null,
    published_at: null,
    review_comment: "",
    updated_at: "2026-11-06T10:00:00Z",
    ...changes,
  }
}

function show(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ConfirmProvider>{ui}</ConfirmProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const LABELS: Record<string, string> = { cv_date: "Date du CV", nationality: "Nationalité" }

describe("barre de vérification", () => {
  it("interdit à un auteur de publier sa propre fiche", () => {
    show(<ReviewBar recordType="expert" record={record({ contributors: [ME] })} userId={ME} fieldLabel={(f) => LABELS[f] ?? f} canArchive={false} />)

    expect(screen.getByText(/Vous avez modifié cette fiche/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Publier" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Renvoyer pour correction" })).toBeDisabled()
  })

  it("dit champ par champ ce qui bloque une publication", async () => {
    fakeServer({
      "GET /api/v1/auth/csrf/": json(200),
      [`POST ${BASE}/publish/`]: json(400, {
        error: { code: "invalid", message: "Non valide.", details: { cv_date: ["Aucune pièce source."], nationality: ["Pièce expirée."] } },
      }),
    })
    document.cookie = "csrftoken=x; path=/"
    show(<ReviewBar recordType="expert" record={record()} userId={ME} fieldLabel={(f) => LABELS[f] ?? f} canArchive={false} />)

    await userEvent.click(screen.getByRole("button", { name: "Publier" }))
    await userEvent.click(screen.getAllByRole("button", { name: "Publier" }).at(-1) as HTMLElement)

    expect(await screen.findByText("La publication est bloquée")).toBeInTheDocument()
    expect(screen.getByText("Date du CV :")).toBeInTheDocument()
    expect(screen.getByText("Aucune pièce source.")).toBeInTheDocument()
    expect(screen.getByText("Nationalité :")).toBeInTheDocument()
  })

  it("montre le commentaire d'un renvoi à l'auteur", () => {
    show(
      <ReviewBar
        recordType="expert"
        record={record({ status: "draft", contributors: [ME], review_comment: "Ajoutez la pièce d'identité." })}
        userId={ME}
        fieldLabel={(f) => f}
        canArchive={false}
      />,
    )

    expect(screen.getByText("Renvoyée pour correction")).toBeInTheDocument()
    expect(screen.getByText("Ajoutez la pièce d'identité.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Soumettre à vérification" })).toBeEnabled()
  })

  it("réserve l'archivage aux rôles qui en ont le droit", () => {
    const { rerender } = show(<ReviewBar recordType="expert" record={record({ status: "published", published_number: 1 })} userId={ME} fieldLabel={(f) => f} canArchive={false} />)
    expect(screen.queryByRole("button", { name: "Archiver" })).not.toBeInTheDocument()
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ConfirmProvider>
            <ReviewBar recordType="expert" record={record({ status: "published", published_number: 1 })} userId={ME} fieldLabel={(f) => f} canArchive />
          </ConfirmProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByRole("button", { name: "Archiver" })).toBeInTheDocument()
  })
})

describe("panneau des preuves", () => {
  it("prend les champs à prouver dans la réponse du serveur, et montre leurs pièces", async () => {
    fakeServer({
      [`GET ${BASE}/confidence/`]: json(200, {
        level: "red",
        by_field: [
          { field: "cv_date", level: "red", reasons: ["Aucune pièce source"] },
          { field: "nationality", level: "green", reasons: [] },
          { field: "experiences.x1.employer", level: "none", reasons: [] },
        ],
      }),
      [`GET ${BASE}/evidence/`]: json(200, [
        {
          id: "ev1",
          field: "nationality",
          origin: "manual",
          document_version_id: "v1",
          document_id: "d1",
          document_title: "Passeport",
          page_number: 2,
          quote: "Nationalité : béninoise",
          match: "exact",
          created_at: "2026-11-06T10:00:00Z",
        },
      ]),
    })
    show(
      <ProofPanel
        recordType="expert"
        recordId="e1"
        describe={(key) => (key in LABELS ? { label: LABELS[key], value: key === "nationality" ? "Béninoise" : "" } : null)}
        editable
      />,
    )

    expect(await screen.findByText("Date du CV")).toBeInTheDocument()
    expect(screen.getByText("Aucune pièce source")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Passeport" })).toHaveAttribute("href", "/documents/d1?page=2")
    expect(screen.getByText("Extrait retrouvé dans la page", { exact: false })).toBeInTheDocument()
    // Les champs d'un élément de liste (expériences) relèvent du lot F1.3 : ignorés ici.
    expect(screen.queryByText("experiences.x1.employer")).not.toBeInTheDocument()
  })
})
