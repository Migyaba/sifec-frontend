import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { ConfirmProvider, useConfirm, type ConfirmResult } from "."

function SendBack() {
  const confirm = useConfirm()
  const [result, setResult] = useState<ConfirmResult | "attente">("attente")
  return (
    <>
      <button
        type="button"
        onClick={async () =>
          setResult(
            await confirm({
              title: "Renvoyer pour correction ?",
              description: "La fiche repasse en brouillon chez son auteur.",
              confirmLabel: "Renvoyer",
              reason: { label: "Motif du renvoi", minLength: 10 },
            }),
          )
        }
      >
        Renvoyer
      </button>
      <output>{result === null ? "annulé" : result === "attente" ? "attente" : result.reason}</output>
    </>
  )
}

describe("confirmation", () => {
  it("exige un motif suffisant, puis le rend", async () => {
    render(
      <ConfirmProvider>
        <SendBack />
      </ConfirmProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Renvoyer" }))

    const dialog = await screen.findByRole("dialog", { name: "Renvoyer pour correction ?" })
    const confirm = screen.getAllByRole("button", { name: "Renvoyer" }).at(-1) as HTMLElement
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText("Motif du renvoi"), "IFU illisible sur la pièce")
    await userEvent.click(confirm)

    expect(dialog).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("IFU illisible sur la pièce")
  })

  it("rend null quand on renonce", async () => {
    render(
      <ConfirmProvider>
        <SendBack />
      </ConfirmProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Renvoyer" }))
    await userEvent.click(await screen.findByRole("button", { name: "Annuler" }))

    expect(screen.getByRole("status")).toHaveTextContent("annulé")
  })
})
