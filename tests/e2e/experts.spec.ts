import { expect, test } from "@playwright/test"

import { depositFixture, login, logout } from "./helpers.ts"

/** Expert complet (lot F1.3) : listes, preuves de chaque élément, accord pour le CV. */
test("un expert complet : diplôme prouvé, expérience, accord pour le CV, publication bloquée tant que tout n'est pas prouvé", async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto("/experts")
  await login(page, "e2e-collab@sifec.test")
  await depositFixture(page)

  await page.goto("/experts/nouveau")
  await page.getByLabel(/^Nom/).fill("DOSSA")
  await page.getByLabel(/^Prénoms/).fill("Mireille")
  await page.getByRole("combobox", { name: /Statut/ }).click()
  await page.getByRole("option", { name: "Associé" }).click()
  await page.getByRole("button", { name: "Créer la fiche" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "DOSSA Mireille" })).toBeVisible()

  // Un diplôme : rouge sans pièce source, puis prouvé.
  const degrees = page.getByRole("region", { name: /Diplômes/ })
  await degrees.getByRole("button", { name: "Ajouter un diplôme" }).click()
  await degrees.getByLabel(/^Intitulé/).fill("Master en audit et contrôle de gestion")
  await degrees.getByLabel(/^Établissement/).fill("Université d'Abomey-Calavi")
  await degrees.getByLabel(/^Année d'obtention/).fill("2012")
  await degrees.getByRole("button", { name: "Enregistrer" }).click()
  const degree = degrees.getByRole("listitem").filter({ hasText: "Master en audit et contrôle de gestion" }).first()
  await expect(degree.getByText("Bloquant")).toBeVisible()

  await degree.getByRole("button", { name: "Preuves" }).click()
  const degreeProofs = degree.getByRole("region", { name: /Preuves de Master/ })
  await expect(degreeProofs.getByText("Aucune pièce source").first()).toBeVisible()
  await degreeProofs.getByRole("button", { name: "Ajouter une preuve" }).first().click()
  await degreeProofs.getByLabel("Rechercher la pièce source").fill("Attestation bonne")
  await degreeProofs.getByRole("button", { name: /Attestation bonne execution 2025/ }).first().click()
  await degreeProofs.getByRole("button", { name: "Rattacher la preuve" }).click()
  await expect(degreeProofs.getByRole("link", { name: "Attestation bonne execution 2025" })).toBeVisible()

  // Une expérience, sans preuve : elle bloquera la publication.
  const experiences = page.getByRole("region", { name: /Expériences/ })
  await experiences.getByRole("button", { name: "Ajouter une expérience" }).click()
  await experiences.getByLabel(/^Poste occupé/).fill("Cheffe de mission d'audit")
  await experiences.getByLabel(/^Employeur ou client/).fill("Ministère fictif de la Santé")
  await experiences.getByLabel(/^Début/).fill("2019-01-15")
  await experiences.getByRole("button", { name: "Enregistrer" }).click()
  await expect(experiences.getByText("Cheffe de mission d'audit, Ministère fictif de la Santé")).toBeVisible()

  // Accord pour le CV, rattaché à une pièce de la base.
  const consents = page.getByRole("region", { name: "Accord pour l'usage du CV" })
  await consents.getByRole("button", { name: "Enregistrer un accord" }).click()
  await consents.getByLabel("Rechercher la pièce source").fill("Attestation bonne")
  await consents.getByRole("button", { name: /Attestation bonne execution 2025/ }).first().click()
  await consents.getByRole("button", { name: "Enregistrer l'accord" }).click()
  await expect(page.getByText("Accord valable")).toBeVisible()
  await expect(consents.getByText(/^Signé le/)).toBeVisible()

  await page.getByLabel(/^Date du CV/).fill("2026-10-01")
  await page.getByRole("button", { name: "Enregistrer", exact: true }).first().click()
  const bar = page.getByRole("region", { name: "Vérification de la fiche" })
  await bar.getByRole("button", { name: "Soumettre à vérification" }).click()
  await expect(bar.getByText("À vérifier", { exact: true })).toBeVisible()
  const url = page.url()

  // Une autre personne tente de publier : refusé, et l'écran dit quoi prouver.
  await logout(page, /Fifa Houngbo/)
  await login(page, "e2e-collab2@sifec.test")
  await page.goto(url)
  await bar.getByRole("button", { name: "Publier" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Publier" }).click()
  await expect(bar.getByText("La publication est bloquée")).toBeVisible()
  await expect(bar.getByText(/Expériences, employeur ou client/)).toBeVisible()
  if (process.env.E2E_CAPTURE) await page.screenshot({ path: `${process.env.E2E_CAPTURE}/expert-desktop.png`, fullPage: true })
})
