import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useLocation } from "react-router"
import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/api"

import { DataTable, nextOrdering, rangeLabel, readListParams, SearchBox, toQuery, useListParams, type Column } from "."

describe("paramètres de liste", () => {
  it("lit l'adresse et ignore une page invalide", () => {
    const params = readListParams(new URLSearchParams("page=0&q=audit&state=published&autre=x"), ["state"])
    expect(params).toEqual({ page: 1, q: "audit", ordering: "", filters: { state: "published" } })
  })

  it("n'envoie à l'API rien de vide", () => {
    expect(toQuery({ page: 1, q: "  ", ordering: "", filters: { state: "draft" } })).toEqual({ state: "draft" })
    expect(toQuery({ page: 3, q: "x", ordering: "-name", filters: {} })).toEqual({ page: 3, q: "x", ordering: "-name" })
  })

  it("trie en croissant, décroissant, puis plus du tout", () => {
    expect(nextOrdering("", "name")).toBe("name")
    expect(nextOrdering("name", "name")).toBe("-name")
    expect(nextOrdering("-name", "name")).toBe("")
    expect(nextOrdering("-date", "name")).toBe("name")
  })

  it("compte les éléments affichés", () => {
    expect(rangeLabel(2, 312)).toBe("51 à 100 sur 312")
    expect(rangeLabel(1, 0)).toBe("Aucun élément")
  })
})

function ListProbe() {
  const { params, update } = useListParams(["state"])
  const location = useLocation()
  return (
    <>
      <SearchBox value={params.q} onSearch={(q) => update({ q })} label="Rechercher" delay={10} />
      <button type="button" onClick={() => update({ page: 2 })}>
        page 2
      </button>
      <output>{location.search}</output>
    </>
  )
}

describe("useListParams", () => {
  it("écrit la recherche dans l'adresse et revient à la première page", async () => {
    render(
      <MemoryRouter initialEntries={["/experts?state=published"]}>
        <ListProbe />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole("button", { name: "page 2" }))
    expect(screen.getByRole("status")).toHaveTextContent("?state=published&page=2")

    await userEvent.type(screen.getByLabelText("Rechercher"), "audit")

    // Frappe lettre par lettre puis pause de recherche : plus long qu'un rendu sur une machine occupée.
    expect(await screen.findByText("?state=published&q=audit", {}, { timeout: 8000 })).toBeInTheDocument()
  })
})

type Row = { id: string; name: string; days: number }
const COLUMNS: Column<Row>[] = [
  { key: "name", header: "Nom", cell: (row) => row.name, sortKey: "name" },
  { key: "days", header: "Jours", cell: (row) => row.days, align: "right", numeric: true },
]

describe("DataTable", () => {
  it("annonce le tri et le demande au serveur", async () => {
    const onSort = vi.fn()
    render(
      <DataTable caption="Experts" columns={COLUMNS} rows={[{ id: "1", name: "Expert A", days: 20 }]} rowKey={(r) => r.id} ordering="-name" onSort={onSort} />,
    )

    expect(screen.getByRole("columnheader", { name: /Nom/ })).toHaveAttribute("aria-sort", "descending")
    await userEvent.click(screen.getByRole("button", { name: "Nom" }))
    expect(onSort).toHaveBeenCalledWith("name")
  })

  it("dit qu'une liste est vide et ce qu'on peut faire", () => {
    render(<DataTable caption="Experts" columns={COLUMNS} rows={[]} rowKey={(r) => r.id} empty={{ title: "Aucun expert", hint: "Retirez un filtre." }} />)
    expect(screen.getByText("Aucun expert")).toBeInTheDocument()
    expect(screen.getByText("Retirez un filtre.")).toBeInTheDocument()
  })

  it("propose de réessayer après une erreur", async () => {
    const onRetry = vi.fn()
    render(<DataTable caption="Experts" columns={COLUMNS} rows={undefined} rowKey={(r) => r.id} error={new ApiError(503, "x", "")} onRetry={onRetry} />)

    expect(screen.getByRole("alert")).toHaveTextContent("La liste n'a pas pu être chargée")
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }))
    expect(onRetry).toHaveBeenCalled()
  })

  it("montre des lignes d'attente au premier chargement", () => {
    const { container } = render(<DataTable caption="Experts" columns={COLUMNS} rows={undefined} rowKey={(r) => r.id} loading />)
    expect(container.querySelector("[aria-busy]")).not.toBeNull()
    expect(screen.getAllByRole("row")).toHaveLength(6)
  })
})
