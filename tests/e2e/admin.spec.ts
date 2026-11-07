import { expect, test } from "@playwright/test"

import { login, loginAsAdmin, loginAsChef, logout } from "./helpers.ts"

/**
 * Administration (lot F1.8) : l'administrateur crée un compte avec un mot de passe provisoire,
 * la personne s'en sert ; le chef de département change un paramètre, délègue la consultation du
 * barème, et le délégué la trouve au menu, en consultation seule. Le journal garde tout.
 */
test("l'administrateur crée un compte, la personne se connecte avec son mot de passe provisoire", async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto("/comptes")
  await loginAsAdmin(page)
  await expect(page.getByRole("heading", { level: 1, name: "Comptes et rôles" })).toBeVisible()
  const nav = page.getByRole("navigation", { name: "Navigation principale" })
  await expect(nav.getByRole("link", { name: "Documents" })).toHaveCount(0)

  await page.getByRole("button", { name: "Nouveau compte" }).click()
  const form = page.getByRole("form", { name: "Nouveau compte" })
  await form.getByLabel(/^Prénom/).fill("Afi")
  await form.getByLabel(/^Nom/).fill("Tchibozo")
  await form.getByLabel(/^Adresse électronique/).fill("e2e-nouveau@sifec.test")
  await form.getByRole("combobox", { name: /^Rôle/ }).click()
  await page.getByRole("option", { name: "Collaborateur" }).click()
  await form.getByRole("button", { name: "Créer le compte" }).click()
  const secret = page.getByLabel("Mot de passe provisoire", { exact: true })
  await expect(page.getByText("Compte de Afi Tchibozo créé")).toBeVisible()
  const password = (await secret.textContent())?.trim() ?? ""
  expect(password).toMatch(/^[\w-]{19}$/)
  await expect(page.getByRole("row", { name: /Afi Tchibozo/ })).toContainText("Collaborateur")

  // Le journal garde la création, au nom de l'administrateur.
  await page.goto("/journal")
  await page.getByRole("combobox", { name: "Action" }).click()
  await page.getByRole("option", { name: "Compte créé" }).click()
  await expect(page.getByRole("row", { name: /Kossi Mensah.*Compte créé/ }).first()).toBeVisible()

  await logout(page, /Kossi Mensah/)
  await login(page, "e2e-nouveau@sifec.test", password)
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour Afi" })).toBeVisible()
})

test("le chef change un paramètre et délègue le barème ; le délégué le consulte sans le modifier", async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto("/parametres")
  await loginAsChef(page)

  // Paramètre : nouvelle valeur motivée, l'ancienne reste dans l'historique.
  const item = page.getByRole("listitem").filter({ hasText: "alerts.signature_urgent_days" })
  await item.getByRole("button", { name: /^Modifier/ }).click()
  const edit = item.getByRole("form")
  await edit.getByLabel("Nouvelle valeur").fill("9")
  await edit.getByLabel("Raison du changement").fill("Les signatures des partenaires prennent plus de temps.")
  await edit.getByRole("button", { name: "Enregistrer" }).click()
  await expect(item.getByText("par défaut : 7")).toBeVisible()
  await item.getByRole("button", { name: /Historique/ }).click()
  await expect(item.getByText(/Les signatures des partenaires prennent plus de temps/)).toBeVisible()

  // Une valeur hors bornes est refusée par le serveur, l'écran le dit.
  await item.getByRole("button", { name: /^Modifier/ }).click()
  await edit.getByLabel("Nouvelle valeur").fill("400")
  await edit.getByLabel("Raison du changement").fill("Essai")
  await edit.getByRole("button", { name: "Enregistrer" }).click()
  await expect(edit.getByRole("alert")).toContainText("inférieure ou égale à 90")
  await edit.getByRole("button", { name: "Annuler" }).click()

  // Délégation écrite : consulter le barème, pour Sèna Dossou.
  await page.goto("/delegations")
  await page.getByRole("button", { name: "Nouvelle délégation" }).click()
  const form = page.getByRole("form", { name: "Nouvelle délégation" })
  await form.getByRole("combobox", { name: /Personne déléguée/ }).click()
  await page.getByRole("option", { name: "Sèna Dossou" }).click()
  await form.getByRole("checkbox", { name: "Consulter le barème" }).check()
  await form.getByLabel(/^Délégation écrite/).fill("Note de service n° 12/2026")
  await form.getByLabel(/^Motif/).fill("Préparation des offres pendant les congés")
  await form.getByRole("button", { name: "Déléguer" }).click()
  const row = page.getByRole("row", { name: /Sèna Dossou/ })
  await expect(row).toContainText("Tarification : Consulter le barème")
  await expect(row).toContainText("En vigueur")
  await logout(page, /Rodrigue Agossou/)

  // Le délégué trouve la tarification au menu, en consultation seule.
  await login(page, "e2e-collab2@sifec.test")
  const nav = page.getByRole("navigation", { name: "Navigation principale" })
  await nav.getByRole("link", { name: "Tarification" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Tarification" })).toBeVisible()
  await expect(page.getByText("Consultation seule")).toBeVisible()
  await expect(page.getByRole("form", { name: "Nouvelle taxe" })).toHaveCount(0)
  await nav.getByRole("link", { name: "Délégations" }).click()
  const received = page.getByRole("row", { name: /Sèna Dossou/ })
  await expect(received).toContainText("au nom de Rodrigue Agossou")
  await expect(received.getByRole("button", { name: "Révoquer" })).toHaveCount(0)
  await expect(nav.getByRole("link", { name: "Paramètres" })).toHaveCount(0)
})
