import { expect, test, type Page } from "@playwright/test"

import { depositFixture, login, loginAsChef, logout } from "./helpers.ts"

/**
 * Alertes, notifications et tableau de bord (lot F1.7) : une pièce administrative qui expire dans
 * dix jours, publiée par une autre personne que son auteur, ouvre une alerte que le chef de
 * département reçoit, voit au tableau de bord, puis traite.
 */
const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

async function prove(page: Page, field: string) {
  const proofs = page.getByRole("region", { name: "Preuves de la fiche" })
  const item = proofs.getByRole("listitem").filter({ hasText: field }).first()
  await item.getByRole("button", { name: "Ajouter une preuve" }).click()
  await item.getByLabel("Rechercher la pièce source").fill("Attestation bonne")
  await item.getByRole("button", { name: /^Attestation bonne execution 2025/ }).first().click()
  await item.getByRole("button", { name: "Rattacher la preuve" }).click()
  await expect(item.getByRole("link", { name: "Attestation bonne execution 2025" })).toBeVisible()
}

test("une pièce qui expire bientôt ouvre une alerte, reçue, vue au tableau de bord et traitée", async ({ page }) => {
  test.setTimeout(200_000)
  await page.goto("/pieces")
  await login(page, "e2e-collab@sifec.test")
  await depositFixture(page)

  await page.goto("/pieces/nouveau")
  await page.getByRole("combobox", { name: /Type de pièce/ }).click()
  await page.getByRole("option", { name: "Attestation de régularité fiscale" }).click()
  await page.getByLabel(/^Numéro/).fill("ARF-2026-0099")
  await page.getByLabel(/^Délivrée le/).fill(iso(-80))
  await page.getByLabel(/^Expire le/).fill(iso(10))
  await page.getByRole("button", { name: "Créer la fiche" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Pièce n° ARF-2026-0099" })).toBeVisible()
  for (const field of ["Numéro", "Délivrée le", "Expire le"]) await prove(page, field)
  const bar = page.getByRole("region", { name: "Vérification de la fiche" })
  await bar.getByRole("button", { name: "Soumettre à vérification" }).click()
  const url = page.url()

  await logout(page, /Fifa Houngbo/)
  await login(page, "e2e-collab2@sifec.test")
  await page.goto(url)
  await bar.getByRole("button", { name: "Publier" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Publier" }).click()
  await expect(bar.getByText("Publiée", { exact: true })).toBeVisible()

  // Le chef de département : notification, tableau de bord, alerte à traiter.
  await logout(page, /Sèna Dossou/)
  await page.goto("/tableau-de-bord")
  await loginAsChef(page)
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour Rodrigue" })).toBeVisible()
  const alerts = page.getByRole("region", { name: "Alertes ouvertes" })
  await expect(alerts.getByText(/Attestation de régularité fiscale/).first()).toBeVisible({ timeout: 30_000 })

  await page.getByRole("button", { name: /Notifications, \d+ non lue/ }).click()
  const notifications = page.getByRole("list", { name: "Dernières notifications" })
  await expect(notifications.getByText(/Attestation de régularité fiscale/).first()).toBeVisible()
  await page.getByRole("button", { name: "Tout marquer comme lu" }).click()
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible()
  await page.keyboard.press("Escape")

  await page.getByRole("link", { name: "Toutes les alertes" }).click()
  const row = page.getByRole("row", { name: /Attestation de régularité fiscale/ }).first()
  await row.getByRole("button", { name: "Traiter" }).click()
  await page.getByLabel("Ce qui est fait").fill("Renouvellement demandé à la DGI.")
  await page.getByRole("dialog").getByRole("button", { name: "Marquer traitée" }).click()
  await expect(page.getByRole("row", { name: /Attestation de régularité fiscale/ })).toHaveCount(0)
  await page.getByRole("combobox", { name: "État des alertes" }).click()
  await page.getByRole("option", { name: "Traitées" }).click()
  await expect(page.getByText("Traitement : Renouvellement demandé à la DGI.")).toBeVisible()
})
