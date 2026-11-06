import { expect, test } from "@playwright/test"

import { depositFixture, login, logout } from "./helpers.ts"

/**
 * Cycle d'une fiche (lot F1.2), avec deux personnes : l'une saisit et prouve, l'autre vérifie.
 * Personne ne publie une fiche qu'il a modifiée.
 */
test("une fiche d'expert est prouvée, renvoyée, corrigée, puis publiée par une autre personne", async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto("/experts")
  await login(page, "e2e-collab@sifec.test")
  await depositFixture(page)

  await page.goto("/experts")
  await page.getByRole("link", { name: "Nouvel expert" }).first().click()
  await page.getByLabel(/^Nom/).fill("AHOUANSOU")
  await page.getByLabel(/^Prénoms/).fill("Codjo Arnaud")
  await page.getByRole("combobox", { name: /Statut/ }).click()
  await page.getByRole("option", { name: "Salarié" }).click()
  await page.getByLabel(/^Date du CV/).fill("2025-03-12")
  await page.getByRole("button", { name: "Créer la fiche" }).click()

  await expect(page.getByRole("heading", { level: 1, name: "AHOUANSOU Codjo Arnaud" })).toBeVisible()
  const bar = page.getByRole("region", { name: "Vérification de la fiche" })
  await expect(bar.getByText("Brouillon", { exact: true })).toBeVisible()

  // La date du CV n'a pas de pièce source : rouge, et la preuve se rattache à la page qui la donne.
  const proofs = page.getByRole("region", { name: "Preuves" })
  await expect(proofs.getByText("Aucune pièce source").first()).toBeVisible()
  await proofs.getByRole("button", { name: "Ajouter une preuve" }).last().click()
  await proofs.getByLabel("Rechercher la pièce source").fill("Attestation bonne")
  await proofs.getByRole("button", { name: /Attestation bonne execution 2025/ }).first().click()
  await proofs.getByLabel("Extrait (facultatif)").fill("Date : 12 mars 2025")
  await proofs.getByRole("button", { name: "Rattacher la preuve" }).click()
  await expect(proofs.getByText("Extrait retrouvé dans la page")).toBeVisible()

  await bar.getByRole("button", { name: "Soumettre à vérification" }).click()
  await expect(bar.getByText("Vous avez modifié cette fiche")).toBeVisible()
  await expect(bar.getByRole("button", { name: "Publier" })).toBeDisabled()
  const url = page.url()

  // Le vérificateur renvoie la fiche avec un commentaire.
  await logout(page, /Fifa Houngbo/)
  await login(page, "e2e-collab2@sifec.test")
  await page.goto(url)
  await bar.getByRole("button", { name: "Renvoyer pour correction" }).click()
  await page.getByLabel("Ce qui doit être corrigé").fill("Ajoutez le titre de l'expert, s'il vous plaît.")
  await page.getByRole("dialog").getByRole("button", { name: "Renvoyer" }).click()
  await expect(bar.getByText("Brouillon", { exact: true })).toBeVisible()

  // L'auteur lit le commentaire, corrige, soumet de nouveau.
  await logout(page, /Sèna Dossou/)
  await login(page, "e2e-collab@sifec.test")
  await page.goto(url)
  await expect(page.getByText("Ajoutez le titre de l'expert, s'il vous plaît.")).toBeVisible()
  await page.getByLabel(/^Titre ou profession/).fill("Expert-comptable")
  await page.getByRole("button", { name: "Enregistrer" }).click()
  await expect(page.getByText("Modifications non enregistrées")).toHaveCount(0)
  await bar.getByRole("button", { name: "Soumettre à vérification" }).click()
  await expect(bar.getByText("À vérifier", { exact: true })).toBeVisible()

  // Une autre personne publie : la validation porte son nom.
  await logout(page, /Fifa Houngbo/)
  await login(page, "e2e-collab2@sifec.test")
  await page.goto(url)
  await bar.getByRole("button", { name: "Publier" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Publier" }).click()
  await expect(bar.getByText("Publiée", { exact: true })).toBeVisible()
  await expect(page.getByRole("region", { name: "Versions publiées" }).getByText(/par Sèna Dossou/)).toBeVisible()
  // Publiée, la date du CV reste à vérifier : le CV a plus de 12 mois, l'expert doit le confirmer.
  await expect(proofs.getByText("CV de plus de 12 mois : faire confirmer par l'expert")).toBeVisible()
})
