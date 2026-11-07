import { expect, test } from "@playwright/test"

import { loginAsChef } from "./helpers.ts"

/**
 * Reprise de l'existant (lot F1.5), sur un dossier d'essai créé par tests/e2e/seed.py : lot,
 * inventaire, dépôt, lecture par le worker, rapport, dossier antérieur à vérifier.
 */
test("un lot de reprise est inventorié, déposé, lu, et crée un dossier antérieur à vérifier", async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto("/reprise")
  await loginAsChef(page)
  await expect(page.getByRole("heading", { name: "Reprise de la base", level: 1 })).toBeVisible()

  await page.getByRole("button", { name: "Nouveau lot" }).click()
  const form = page.getByRole("form", { name: "Nouveau lot de reprise" })
  await form.getByLabel(/^Nom du lot/).fill("Essai : pièces et AMI 2025")
  await form.getByLabel(/^Ordre de reprise/).fill("1")
  await form.getByLabel(/^Dossiers inclus/).fill("Docs administratifs\nPropositions/2025")
  await form.getByLabel(/^Dossiers déposés/).fill("Propositions/2025")
  await form.getByRole("button", { name: "Créer le lot" }).click()

  await expect(page.getByRole("heading", { name: "Essai : pièces et AMI 2025", level: 1 })).toBeVisible()
  await page.getByRole("button", { name: "Inventorier" }).click()
  await expect(page.getByText("Inventaire prêt").first()).toBeVisible({ timeout: 60_000 })
  const report = page.getByRole("region", { name: "Rapport de reprise" })
  await expect(report.getByText("Dans le périmètre").locator("..").getByText("4")).toBeVisible()

  await page.getByRole("button", { name: "Déposer les fichiers" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Déposer" }).click()
  await expect(page.getByText("Fichiers déposés").first()).toBeVisible({ timeout: 60_000 })
  await expect(report.getByText("Lecture terminée")).toBeVisible({ timeout: 90_000 })
  await expect(report.getByText("Prêts").locator("..").getByText("4")).toBeVisible()

  const files = page.getByRole("region", { name: "Fichiers du lot" })
  await expect(files.getByRole("link", { name: "RCCM 2024.pdf" })).toBeVisible()
  if (process.env.E2E_CAPTURE) await page.screenshot({ path: `${process.env.E2E_CAPTURE}/batch-desktop.png`, fullPage: true })

  await report.getByRole("link", { name: "Les ouvrir" }).click()
  await expect(page.getByText("Dossiers créés par un lot de reprise.")).toBeVisible()
  await expect(page.getByRole("row", { name: /AMI AUDIT FONDS FICTIF/ })).toBeVisible()
})
