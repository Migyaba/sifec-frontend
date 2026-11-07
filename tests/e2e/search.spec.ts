import { expect, test } from "@playwright/test"

import { depositFixture, login } from "./helpers.ts"

/** Recherche dans la base (lot F1.4) : une pièce lue se retrouve par un mot de son texte. */
test("une pièce se retrouve par un mot de son texte et s'ouvre à la page citée", async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto("/documents")
  await login(page, "e2e-collab@sifec.test")
  await depositFixture(page)

  await page.getByLabel("Rechercher dans la base").fill("satisfaction")
  await page.getByLabel("Rechercher dans la base").press("Enter")
  await expect(page.getByRole("heading", { name: "Recherche", level: 1 })).toBeVisible()

  const results = page.getByRole("list", { name: "Résultats" })
  const first = results.getByRole("listitem").filter({ hasText: "Attestation bonne execution 2025" }).first()
  await expect(first.locator("mark").first()).toHaveText(/satisfaction/i)
  await first.getByRole("link", { name: /Attestation bonne execution 2025/ }).click()
  await expect(page.getByText("Page 1 sur 2")).toBeVisible()

  // À une date passée : la pièce, sans date d'émission, est écartée, et l'écran le dit.
  await page.goto("/recherche?q=satisfaction&as_of=2020-01-01")
  await expect(page.getByText(/sans date d'émission écartée/)).toBeVisible()
})
