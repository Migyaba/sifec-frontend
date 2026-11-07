import { expect, test } from "@playwright/test"

import { depositFixture, login, loginAsChef, WORD_FORM } from "./helpers.ts"

/** Bibliothèque et tarification (lot F1.6). */
test("une méthodologie avec ses sections, et sa place dans la couverture par type de mission", async ({ page }) => {
  await page.goto("/methodologies")
  await login(page, "e2e-collab@sifec.test")
  await expect(page.getByRole("region", { name: "Méthodologies publiées par type de mission" })).toBeVisible()

  await page.getByRole("link", { name: "Nouvelle méthodologie" }).first().click()
  await page.getByLabel(/^Intitulé/).fill("Audit financier de projet sur financement extérieur")
  await page.getByRole("combobox", { name: /Type de mission/ }).click()
  await page.getByRole("option", { name: "Audit financier et comptable" }).click()
  await page.getByRole("button", { name: "Créer la fiche" }).click()
  await expect(page.getByRole("heading", { level: 1, name: /Audit financier de projet/ })).toBeVisible()

  const sections = page.getByRole("region", { name: /Sections/ })
  await sections.getByRole("button", { name: "Ajouter une section" }).click()
  await sections.getByLabel(/^Titre/).fill("Démarche d'audit")
  await sections.getByLabel(/^Texte/).fill("Prise de connaissance, évaluation du contrôle interne, contrôles de substance, rapport.")
  await sections.getByRole("button", { name: "Enregistrer" }).click()
  await expect(sections.getByText("Démarche d'audit")).toBeVisible()
})

test("un formulaire type décrit par ses champs et ses règles, essayé avant usage", async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto("/documents")
  await login(page, "e2e-collab@sifec.test")
  await depositFixture(page, WORD_FORM)

  await page.goto("/formulaires/nouveau")
  await page.getByLabel(/^Code/).fill("TECH-1")
  await page.getByLabel(/^Intitulé/).fill("Lettre de soumission de la proposition technique")
  await page.getByRole("combobox", { name: /Procédure/ }).click()
  await page.getByRole("option", { name: "Demande de propositions" }).click()
  await page.getByRole("combobox", { name: /Format d'origine/ }).click()
  await page.getByRole("option", { name: /Fourni en Word/ }).click()
  await page.getByLabel("Rechercher la pièce source").fill("Formulaire TECH")
  await page.getByRole("button", { name: /Formulaire TECH-1 essai/ }).first().click()
  await page.getByLabel(/^Champs attendus/).fill('[{"key": "nom_cabinet", "label": "Nom du cabinet"}]')
  await page.getByLabel(/^Règles de remplissage/).fill('[{"pattern": "^\\\\[Nom du cabinet\\\\]", "action": "fill", "template": "{nom_cabinet}"}]')
  await page.getByRole("button", { name: "Créer la fiche" }).click()
  await expect(page.getByRole("heading", { level: 1, name: /TECH-1/ })).toBeVisible()

  const trial = page.getByRole("region", { name: "Essai de remplissage" })
  await trial.getByLabel("Nom du cabinet").fill("Cabinet SIFEC")
  await trial.getByRole("button", { name: "Remplir pour essai" }).click()
  await expect(trial.getByText("Formulaire rempli entièrement")).toBeVisible()
  const download = page.waitForEvent("download")
  await trial.getByRole("button", { name: "Télécharger" }).click()
  expect((await download).suggestedFilename()).toMatch(/\.docx$/)
})

test("un JSON mal formé est signalé avant l'envoi", async ({ page }) => {
  await page.goto("/formulaires/nouveau")
  await login(page, "e2e-collab@sifec.test")
  await page.getByLabel(/^Champs attendus/).fill('[{"key": "oubli"')
  await page.getByRole("button", { name: "Créer la fiche" }).click()
  await expect(page.getByText(/JSON invalide/)).toBeVisible()
})

test("le chef de département ajoute une catégorie d'expert et son taux daté", async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto("/tarification")
  await loginAsChef(page)
  await expect(page.getByRole("heading", { name: "Tarification", level: 1 })).toBeVisible()

  const form = page.getByRole("form", { name: "Nouvelle catégorie d'expert" })
  await form.getByLabel("Code").fill("CM")
  await form.getByLabel("Intitulé").fill("Chef de mission")
  await form.getByRole("button", { name: "Ajouter" }).click()
  const row = page.getByRole("row", { name: /Chef de mission/ })
  await expect(row.getByText("Aucun taux à cette date")).toBeVisible()

  await row.getByRole("button", { name: "Historique" }).click()
  await page.getByLabel("Nouveau taux journalier : Chef de mission").fill("250000")
  // Date d'effet du jour (valeur proposée) : une date passée réécrirait des dossiers déjà montés.
  await page.getByLabel("Raison du changement").fill("Barème 2026 validé par le chef de département")
  await page.getByRole("button", { name: "Enregistrer" }).click()
  await expect(row.getByText(/250\s000 XOF/).first()).toBeVisible()

  await page.getByRole("tab", { name: "Taxes" }).click()
  const tax = page.getByRole("form", { name: "Nouvelle taxe" })
  await tax.getByLabel("Code").fill("TVA")
  await tax.getByLabel("Intitulé").fill("Taxe sur la valeur ajoutée")
  await tax.getByLabel("Taux (%)").fill("18")
  await tax.getByLabel("Raison").fill("Taux légal")
  await tax.getByRole("button", { name: "Ajouter la taxe" }).click()
  await expect(page.getByRole("row", { name: /Taxe sur la valeur ajoutée/ }).getByText("18 %")).toBeVisible()
})
