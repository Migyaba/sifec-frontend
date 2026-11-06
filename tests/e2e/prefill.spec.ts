import { expect, test } from "@playwright/test"

import { depositFixture, login } from "./helpers.ts"

/**
 * Préremplissage par l'IA (lot F1.3), avec le fournisseur simulé : aucun document ne part à
 * l'extérieur. Sans réponse préparée, l'IA échoue : le parcours vérifie que l'échec est annoncé,
 * au lieu d'un préremplissage qui resterait « en cours » pour toujours.
 */
test("un préremplissage lancé depuis la liste aboutit, ici en échec annoncé", async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto("/experts")
  await login(page, "e2e-collab@sifec.test")
  await depositFixture(page)

  await page.goto("/experts")
  await page.getByRole("button", { name: "Préremplir depuis une pièce" }).click()
  const panel = page.getByRole("form", { name: "Préremplir depuis une pièce" })
  await panel.getByLabel("Rechercher la pièce source").fill("Attestation bonne")
  await panel.getByRole("button", { name: /Attestation bonne execution 2025/ }).first().click()
  await panel.getByRole("combobox", { name: /Statut/ }).click()
  await page.getByRole("option", { name: "Salarié" }).click()
  await panel.getByRole("button", { name: "Lancer le préremplissage" }).click()

  await expect(page.getByText("Préremplissage lancé")).toBeVisible()
  await expect(page.getByText("Le préremplissage a échoué sur une erreur inattendue", { exact: false })).toBeVisible({ timeout: 60_000 })
})
