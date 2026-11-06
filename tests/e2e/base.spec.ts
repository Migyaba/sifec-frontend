import { expect, test } from "@playwright/test"

import { depositFixture, login } from "./helpers.ts"

/** Autres fiches de la base (lot F1.3) : référence, pièce administrative, fiche institutionnelle. */
test("une référence avec un client créé sur place et son attestation de bonne exécution", async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto("/references")
  await login(page, "e2e-collab@sifec.test")

  await page.getByRole("link", { name: "Nouvelle référence" }).first().click()
  await page.getByLabel(/^Intitulé de la mission/).fill("Audit des comptes du projet fictif d'eau potable")
  // Le Cabinet est la seule entité : choisi d'office.
  await expect(page.getByText("Cabinet SIFEC")).toBeVisible()
  await page.getByRole("searchbox", { name: "Client" }).fill("Agence fictive de l'eau")
  await page.getByRole("button", { name: "Créer « Agence fictive de l'eau »" }).click()
  await expect(page.getByText("Agence fictive de l'eau")).toBeVisible()
  await page.getByRole("combobox", { name: /Type de mission/ }).click()
  await page.getByRole("option", { name: "Audit financier et comptable" }).click()
  await page.getByLabel(/^Début/).fill("2023-02-01")
  await page.getByLabel(/^Fin \(vide/).fill("2023-11-30")
  await page.getByRole("button", { name: "Créer la fiche" }).click()

  await expect(page.getByRole("heading", { level: 1, name: "Audit des comptes du projet fictif d'eau potable" })).toBeVisible()
  const certificates = page.getByRole("region", { name: /Attestations de bonne exécution/ })
  await certificates.getByRole("button", { name: "Ajouter une attestation" }).click()
  await certificates.getByLabel(/^Délivrée le/).fill("2024-01-15")
  await certificates.getByLabel(/^Signataire/).fill("Directeur fictif")
  await certificates.getByRole("button", { name: "Enregistrer" }).click()
  await expect(certificates.getByText("Attestation du 2024-01-15")).toBeVisible()

  await page.goto("/references")
  const row = page.getByRole("row", { name: /eau potable/ })
  await expect(row.getByText("Agence fictive de l'eau")).toBeVisible()
  await expect(row.getByText("Brouillon")).toBeVisible()
})

test("une pièce administrative expirée se voit en rouge dans la liste", async ({ page }) => {
  await page.goto("/pieces/nouveau")
  await login(page, "e2e-collab@sifec.test")

  await page.getByRole("combobox", { name: /Type de pièce/ }).click()
  await page.getByRole("option").first().click()
  await page.getByLabel(/^Numéro/).fill("AF-2025-0042")
  await page.getByLabel(/^Expire le/).fill("2025-06-30")
  await page.getByRole("button", { name: "Créer la fiche" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Pièce n° AF-2025-0042" })).toBeVisible()

  await page.goto("/pieces")
  await expect(page.getByRole("row", { name: /AF-2025-0042/ }).getByText(/Expirée le 30 juin 2025/)).toBeVisible()
})

test("la fiche institutionnelle du Cabinet", async ({ page }) => {
  await page.goto("/institutions/nouveau")
  await login(page, "e2e-collab@sifec.test")

  await page.getByLabel(/^Raison sociale/).fill("SIFEC SARL (fictif)")
  await page.getByLabel(/^IFU/).fill("3201900000000")
  await page.getByRole("button", { name: "Créer la fiche" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "SIFEC SARL (fictif)" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Vérification de la fiche" }).getByText("Brouillon", { exact: true })).toBeVisible()
})

test("un dossier antérieur et le fichier réellement déposé", async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto("/anciens-dossiers")
  await login(page, "e2e-collab@sifec.test")
  await depositFixture(page)

  await page.goto("/anciens-dossiers/nouveau")
  await page.getByLabel(/^Intitulé/).fill("AMI 007/2025 : audit fictif du fonds routier")
  await page.getByRole("combobox", { name: /Procédure/ }).click()
  await page.getByRole("option", { name: "Avis à manifestation d'intérêt" }).click()
  await page.getByLabel(/^Formulaires utilisés/).fill("TECH-1, TECH-2")
  await page.getByLabel(/^Déposé le/).fill("2025-04-10")
  await page.getByRole("button", { name: "Créer la fiche" }).click()
  await expect(page.getByRole("heading", { level: 1, name: /AMI 007\/2025/ })).toBeVisible()
  await expect(page.getByLabel(/^Formulaires utilisés/)).toHaveValue("TECH-1, TECH-2")

  const files = page.getByRole("region", { name: /Fichiers déposés/ })
  await files.getByRole("button", { name: "Ajouter un fichier" }).click()
  await files.getByRole("combobox", { name: /Rôle du fichier/ }).click()
  await page.getByRole("option", { name: "Manifestation d'intérêt déposée" }).click()
  await files.getByLabel("Rechercher la pièce source").fill("Attestation bonne")
  await files.getByRole("button", { name: /Attestation bonne execution 2025/ }).first().click()
  await files.getByRole("button", { name: "Enregistrer" }).click()
  await expect(files.getByText("Manifestation d'intérêt déposée").first()).toBeVisible()
  await expect(files.getByText("Attestation bonne execution 2025").first()).toBeVisible()
})
