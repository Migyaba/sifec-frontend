import path from "node:path"

import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

/**
 * Dépôt réel (lot F1.1) : morceaux envoyés directement à MinIO, fichier lu par un vrai worker,
 * puis fiche du document. Compartiment propre aux parcours (sifec-e2e).
 */

const PASSWORD = process.env.E2E_PASSWORD ?? "Parcours-e2e-2026"
const FILE = path.join(import.meta.dirname, "fixtures", "Attestation bonne execution 2025.pdf")

test("un collaborateur dépose une pièce, la voit lue, puis la qualifie et la télécharge", async ({ page }) => {
  // Dépôt, lecture par le worker et suivi : plus long qu'un écran ordinaire.
  test.setTimeout(120_000)
  await page.goto("/documents")
  await page.getByLabel("Adresse électronique").fill("e2e-collab@sifec.test")
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Se connecter" }).click()
  await expect(page.getByRole("heading", { name: "Documents", level: 1 })).toBeVisible()

  await page.getByRole("button", { name: "Déposer des documents" }).first().click()
  await page.locator('input[type="file"]').setInputFiles(FILE)

  const uploads = page.getByRole("list", { name: "Dépôts" })
  await expect(uploads.getByText("Reçu, traitement en cours")).toBeVisible({ timeout: 30_000 })

  // Le worker lit le fichier ; le suivi l'annonce et la liste se met à jour.
  await expect(page.getByText("Lecture de « Attestation bonne execution 2025.pdf »").first()).toBeVisible({ timeout: 60_000 })
  const row = page.getByRole("row", { name: /Attestation bonne execution 2025/ })
  await expect(row.getByText("Prêt")).toBeVisible({ timeout: 60_000 })
  await expect(row.getByText("Attestation de bonne fin")).toBeVisible()

  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()
  expect(accessibility.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([])

  await row.getByRole("link").click()
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Attestation bonne execution 2025")
  await expect(page.getByText("Page 1 sur 2")).toBeVisible()
  await expect(page.getByText("ATTESTATION DE BONNE EXECUTION")).toBeVisible()
  await page.getByRole("button", { name: "Page suivante" }).click()
  await expect(page.getByText("montant du marche 18 500 000 FCFA")).toBeVisible()

  await page.getByLabel("Date d'émission").fill("2025-03-12")
  await page.getByRole("button", { name: "Enregistrer" }).click()
  await expect(page.getByRole("button", { name: "Enregistrer" })).toHaveCount(0)

  await page.getByLabel("Type de pièce").click()
  await page.getByRole("option", { name: "Lettre de mission" }).click()
  await expect(page.getByText("Choisi par un collaborateur")).toBeVisible()

  await page.reload()
  await expect(page.getByLabel("Date d'émission")).toHaveValue("2025-03-12")
  await expect(page.getByLabel("Type de pièce")).toContainText("Lettre de mission")

  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Télécharger" }).click()
  expect((await download).suggestedFilename()).toContain("Attestation bonne execution 2025")
})
