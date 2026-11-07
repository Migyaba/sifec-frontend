import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { totp } from "./totp.ts"

/** Parcours de connexion contre le vrai backend (lot F0.5). Comptes créés par tests/e2e/seed.py. */

const PASSWORD = process.env.E2E_PASSWORD ?? "Parcours-e2e-2026"
const COLLAB = "e2e-collab@sifec.test"
const POLE = "e2e-pole@sifec.test"

async function login(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel("Adresse électronique").fill(email)
  await page.getByLabel("Mot de passe", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Se connecter" }).click()
}

async function logout(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).click()
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click()
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible()
}

test("la page de connexion n'a aucun défaut d'accessibilité sérieux", async ({ page }) => {
  await page.goto("/connexion")
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()

  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([])
})

test("un collaborateur se connecte, retrouve la page demandée, puis se déconnecte", async ({ page }) => {
  await page.goto("/experts")
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible()

  await login(page, COLLAB, "mauvais-mot-de-passe")
  await expect(page.getByRole("alert")).toHaveText("Adresse ou mot de passe incorrect.")

  await login(page, COLLAB)
  await expect(page.getByRole("heading", { name: "Experts" })).toBeVisible()
  const nav = page.getByRole("navigation", { name: "Navigation principale" })
  await expect(nav.getByRole("link", { name: "Avis", exact: true })).toBeVisible()
  await expect(nav.getByRole("link", { name: "Journal des actions" })).toHaveCount(0)

  await page.goto("/journal")
  await expect(page.getByRole("heading", { name: "Accès réservé" })).toBeVisible()

  await logout(page, /Fifa Houngbo/)
  await page.goto("/experts")
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible()
})

test("un chef de pôle active la double authentification, puis entre avec un code de secours", async ({ page }) => {
  await page.goto("/")
  await login(page, POLE)

  await expect(page.getByRole("heading", { name: "Activer la double authentification" })).toBeVisible()
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible()
  const secret = (await page.locator("code").textContent())?.trim() ?? ""
  expect(secret).toMatch(/^[A-Z2-7 ]{16,}$/)

  await page.getByLabel("Code à 6 chiffres").fill(totp(secret))
  await page.getByRole("button", { name: "Activer" }).click()

  await expect(page.getByRole("heading", { name: "Codes de secours" })).toBeVisible()
  const codes = await page.getByRole("listitem").allTextContents()
  expect(codes.length).toBeGreaterThan(0)
  const proceed = page.getByRole("button", { name: "Accéder à l'application" })
  await expect(proceed).toBeDisabled()
  await page.getByRole("checkbox").check()
  await proceed.click()
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour Aurel" })).toBeVisible()

  await logout(page, /Aurel Kpadonou/)
  await login(page, POLE)
  await expect(page.getByRole("heading", { name: "Code de vérification" })).toBeVisible()

  await page.getByRole("button", { name: "Utiliser un code de secours" }).click()
  await page.getByLabel("Code de secours").fill("faux000")
  await page.getByRole("button", { name: "Vérifier le code" }).click()
  await expect(page.getByRole("alert")).toContainText("Code incorrect")

  // Aussitôt après un code faux, le serveur bloque quelques secondes, même le bon code.
  await page.getByLabel("Code de secours").fill(codes[0].trim())
  await page.getByRole("button", { name: "Vérifier le code" }).click()
  await expect(page.getByRole("alert")).toContainText("Réessayez dans")

  await page.waitForTimeout(1500)
  await page.getByRole("button", { name: "Vérifier le code" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour Aurel" })).toBeVisible()
})
