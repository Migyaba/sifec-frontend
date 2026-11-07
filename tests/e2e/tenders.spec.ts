import path from "node:path"

import { expect, test, type Page } from "@playwright/test"

import { login } from "./helpers.ts"

/**
 * Avis et fiche d'exigences (lot F2.1). L'extraction tourne avec le fournisseur d'IA simulé, qui
 * rejoue les réponses préparées de tests/e2e/fake-ai.json : aucun document ne part à l'extérieur.
 * Les deux pièces sont fictives (tests/e2e/fixtures/make_tender_fixtures.py).
 */
const NOTICE = path.join(import.meta.dirname, "fixtures", "Avis AMI essai.pdf")
const ADDENDUM = path.join(import.meta.dirname, "fixtures", "Additif AMI essai.pdf")

async function attach(page: Page, file: string, kind?: string) {
  await page.getByRole("button", { name: "Ajouter un document" }).click()
  const form = page.getByRole("form", { name: "Ajouter un document à l'avis" })
  if (kind) {
    await form.getByRole("combobox", { name: "Nature du document" }).click()
    await page.getByRole("option", { name: kind, exact: true }).click()
  }
  await form.locator('input[type="file"]').setInputFiles(file)
  await expect(form.getByText(`Fichier déposé : ${path.basename(file)}`)).toBeVisible({ timeout: 30_000 })
  await form.getByRole("button", { name: "Rattacher à l'avis" }).click()
  await expect(form).toHaveCount(0)
}

test("un avis déposé donne une fiche d'exigences citée, tranchée, puis comparée après un additif", async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto("/avis")
  await login(page, "e2e-collab@sifec.test")
  await expect(page.getByRole("heading", { level: 1, name: "Avis" })).toBeVisible()

  await page.getByRole("button", { name: "Nouvel avis" }).click()
  const create = page.getByRole("form", { name: "Nouvel avis" })
  await create.getByLabel(/^Référence/).fill("AMI n° 007/2026")
  await create.getByLabel(/^Intitulé/).fill("Audit des comptes du projet fictif d'eau potable")
  await create.getByRole("button", { name: "Enregistrer l'avis" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Audit des comptes du projet fictif d'eau potable" })).toBeVisible()

  // L'avis, déposé puis lu ; l'extraction attend la fin de la lecture si besoin.
  await attach(page, NOTICE)
  const documents = page.getByRole("region", { name: "Documents de l'avis" })
  await expect(documents.getByRole("link", { name: "Avis AMI essai" })).toBeVisible()
  await page.getByRole("button", { name: "Extraire la fiche d'exigences" }).click()

  const sheet = page.getByRole("region", { name: "Fiche d'exigences" })
  const deadline = sheet.getByRole("listitem", { name: "Date limite de dépôt" })
  await expect(deadline).toContainText("15 décembre 2026 à 10 heures", { timeout: 90_000 })
  await expect(deadline).toContainText("« au plus tard le 15 décembre 2026 à 10 heures »")
  await expect(deadline.getByRole("link", { name: /page 1/ })).toHaveAttribute("href", /\/documents\/.+\?page=1$/)
  await expect(sheet.getByText("1 point à trancher")).toBeVisible()

  // Le point à trancher est confirmé ; une valeur est corrigée ; une exigence est retirée.
  const language = sheet.getByRole("listitem", { name: "Langue de la manifestation" })
  await expect(language).toContainText("À trancher")
  await language.getByRole("button", { name: /^Confirmer/ }).click()
  await expect(language).toContainText("Confirmé")
  await expect(sheet.getByText("1 point à trancher")).toHaveCount(0)

  const copies = sheet.getByRole("listitem", { name: "Nombre d'exemplaires" })
  await copies.getByRole("button", { name: /^Corriger/ }).click()
  await copies.getByLabel("Valeur retenue").fill("Trois exemplaires dont un original, sous pli fermé")
  await copies.getByRole("button", { name: "Enregistrer la correction" }).click()
  await expect(copies).toContainText("Lu par l'IA : Trois exemplaires dont un original")

  const subject = sheet.getByRole("listitem", { name: "Objet" })
  await subject.getByRole("button", { name: /^Retirer/ }).click()
  await page.getByLabel("Pourquoi la retirer").fill("Doublon de l'intitulé de l'avis.")
  await page.getByRole("dialog").getByRole("button", { name: "Retirer" }).click()
  await expect(sheet.getByRole("listitem", { name: "Objet" })).toHaveCount(0)

  // L'additif relance l'extraction : la version 2 dit ce qui change, la correction reste.
  await attach(page, ADDENDUM, "Additif")
  await expect(sheet.getByText("Ce qui change depuis la version 1")).toBeVisible({ timeout: 90_000 })
  const changes = sheet.getByRole("region", { name: /Ce qui change depuis la version 1/ })
  await expect(changes).toContainText("Date limite de dépôt")
  await expect(changes).toContainText("22 décembre 2026 à 10 heures")
  await expect(sheet.getByRole("listitem", { name: "Date limite de dépôt" })).toContainText("« reportée au 22 décembre 2026 à 10 heures »")
  await expect(sheet.getByRole("listitem", { name: "Nombre d'exemplaires" })).toContainText("sous pli fermé")

  // La version 1 reste consultable, en lecture seule.
  await sheet.getByRole("combobox", { name: "Version de la fiche" }).click()
  await page.getByRole("option", { name: "Version 1" }).click()
  await expect(sheet.getByText("version antérieure, en lecture seule")).toBeVisible()
  await expect(sheet.getByRole("listitem", { name: "Date limite de dépôt" })).toContainText("15 décembre 2026")
  await expect(sheet.getByRole("button", { name: /^Corriger/ })).toHaveCount(0)
})
