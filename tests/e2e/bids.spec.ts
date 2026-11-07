import path from "node:path"

import { expect, test } from "@playwright/test"

import { login, loginAsChef, loginAsPole, logout } from "./helpers.ts"

/**
 * Dossier et parcours (lot F2.2). L'avis est extrait par le fournisseur d'IA simulé (réponses
 * préparées de tests/e2e/fake-ai.json) ; chaque étape est faite par le rôle que le parcours
 * prévoit : le collaborateur monte le dossier, le chef de pôle valide la fiche, le chef de
 * département décide du Go.
 */
const NOTICE = path.join(import.meta.dirname, "fixtures", "Avis AMI dossier essai.pdf")
const REFERENCE = "AMI n° 008/2026"
const TITLE = "Audit des comptes du projet fictif d'assainissement"

test("un dossier suit son parcours : fiche validée par le chef de pôle, Go décidé par le chef de département", async ({ page }) => {
  test.setTimeout(300_000)
  await page.goto("/avis")
  await login(page, "e2e-collab@sifec.test")

  // L'avis, déposé et extrait.
  await page.getByRole("button", { name: "Nouvel avis" }).click()
  const create = page.getByRole("form", { name: "Nouvel avis" })
  await create.getByLabel(/^Référence/).fill(REFERENCE)
  await create.getByLabel(/^Intitulé/).fill(TITLE)
  await create.getByRole("button", { name: "Enregistrer l'avis" }).click()
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible()
  await page.getByRole("button", { name: "Ajouter un document" }).click()
  const attach = page.getByRole("form", { name: "Ajouter un document à l'avis" })
  await attach.locator('input[type="file"]').setInputFiles(NOTICE)
  await expect(attach.getByText("Fichier déposé : Avis AMI dossier essai.pdf")).toBeVisible({ timeout: 30_000 })
  await attach.getByRole("button", { name: "Rattacher à l'avis" }).click()
  await page.getByRole("button", { name: "Extraire la fiche d'exigences" }).click()
  const sheet = page.getByRole("region", { name: "Fiche d'exigences" })
  await expect(sheet.getByText("1 point à trancher")).toBeVisible({ timeout: 90_000 })

  // Le dossier, monté depuis l'avis pour le compte du Cabinet : sa créatrice en est responsable.
  const onTender = page.getByRole("region", { name: "Dossiers sur cet avis" })
  await onTender.getByRole("button", { name: "Monter un dossier" }).click()
  const form = page.getByRole("form", { name: "Nouveau dossier" })
  await expect(form.getByText("Cabinet SIFEC")).toBeVisible()
  await form.getByRole("button", { name: "Créer le dossier" }).click()
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible()
  await expect(page.getByRole("list", { name: "Parcours du dossier" }).getByRole("listitem")).toHaveCount(8)
  await expect(page.getByText("2 étapes faites sur 8")).toBeVisible()

  const now = page.getByRole("region", { name: "À faire maintenant" })
  const requirements = now.getByRole("region", { name: "Validation de la fiche d'exigences" })
  await expect(requirements).toContainText("1 point à trancher")
  await expect(requirements).toContainText("En attente : chef de pôle")
  await expect(requirements.getByRole("button", { name: "Valider" })).toHaveCount(0)

  const team = page.getByRole("region", { name: "Équipe du dossier" })
  await expect(team).toContainText("Fifa Houngbo")
  await expect(team).toContainText("Responsable du dossier")
  await team.getByRole("button", { name: "Ajouter un membre" }).click()
  await team.getByRole("combobox", { name: "Personne" }).click()
  await page.getByRole("option", { name: "Sèna Dossou" }).click()
  await team.getByRole("button", { name: "Ajouter", exact: true }).click()
  await expect(team.getByRole("listitem").filter({ hasText: "Sèna Dossou" })).toContainText("Contributeur")
  await logout(page, /Fifa Houngbo Collaborateur/)

  // Le chef de pôle trouve la validation qui l'attend ; la fiche doit être sans point à trancher.
  await loginAsPole(page)
  await page.goto("/validations")
  await page.getByRole("list", { name: "Validations en attente" }).getByRole("link", { name: new RegExp(`Validation de la fiche d'exigences.*${REFERENCE}`) }).click()
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible()
  await requirements.getByRole("button", { name: "Valider" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Valider" }).click()
  await expect(requirements.getByRole("alert")).toContainText("Il reste 1 point(s) à trancher sur la fiche.")

  await requirements.getByRole("link", { name: "Relire la fiche" }).click()
  const language = sheet.getByRole("listitem", { name: "Langue de la manifestation" })
  await language.getByRole("button", { name: /^Confirmer/ }).click()
  await expect(language).toContainText("Confirmé")
  await page.goBack()
  await expect(requirements).toContainText("Aucun point à trancher")
  await requirements.getByRole("button", { name: "Valider" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Valider" }).click()

  const decisions = page.getByRole("region", { name: "Décisions" })
  await expect(decisions).toContainText("Validation de la fiche d'exigences : validée")
  await expect(decisions).toContainText("Mariam Soglo")

  // Le tableau Go / No-Go : la plateforme ne juge pas ce qu'elle n'a pas contrôlé.
  const table = page.getByRole("region", { name: "Tableau Go / No-Go" })
  await expect(table.getByRole("listitem").filter({ hasText: "Délai restant" })).toContainText("Date limite non renseignée.")
  const conflict = table.getByRole("listitem").filter({ hasText: "Conflit d'intérêts ou exclusion" })
  await expect(conflict).toContainText("À vérifier")
  await conflict.getByRole("button", { name: "Apprécier" }).click()
  await conflict.getByRole("radio", { name: "Satisfait", exact: true }).click()
  await conflict.getByLabel("Justification").fill("Aucun lien avec l'autorité contractante ni avec le projet.")
  await conflict.getByRole("button", { name: "Enregistrer" }).click()
  await expect(conflict).toContainText("Par Mariam Soglo")
  await expect(now.getByRole("region", { name: "Décision Go / No-Go" })).toContainText("En attente : chef de département")
  await logout(page, /Mariam Soglo Chef de pôle/)

  // Le chef de département décide de poursuivre ; l'étape suivante dit ce qui lui manque.
  await loginAsChef(page)
  await page.goto("/validations")
  await page.getByRole("list", { name: "Validations en attente" }).getByRole("link", { name: new RegExp(`Décision Go / No-Go.*${REFERENCE}`) }).click()
  const go = now.getByRole("region", { name: "Décision Go / No-Go" })
  await go.getByRole("button", { name: "Go : poursuivre" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Go : poursuivre" }).click()
  await expect(decisions).toContainText("Décision Go / No-Go : validée")
  await expect(decisions).toContainText("Rodrigue Agossou")

  const contents = now.getByRole("region", { name: "Choix du témoin, des experts, des références et des pièces" })
  await contents.getByRole("button", { name: "Déclarer l'étape terminée" }).click()
  await expect(contents.getByRole("alert")).toContainText("Ajoutez d'abord les contenus du dossier.")
  await expect(page.getByText("4 étapes faites sur 8")).toBeVisible()

  await page.goto("/dossiers")
  const row = page.getByRole("row").filter({ hasText: REFERENCE })
  await expect(row).toContainText("Cabinet SIFEC")
  await expect(row).toContainText("4 sur 8")
})
