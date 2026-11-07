import path from "node:path"

import { expect, type Page } from "@playwright/test"

import { totp } from "./totp.ts"

export const PASSWORD = process.env.E2E_PASSWORD ?? "Parcours-e2e-2026"
export const FIXTURE = path.join(import.meta.dirname, "fixtures", "Attestation bonne execution 2025.pdf")

/** Se connecte, puis attend d'être dans l'application : quitter la page plus tôt couperait la connexion. */
export async function login(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel("Adresse électronique").fill(email)
  await page.getByLabel("Mot de passe", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Se connecter" }).click()
  await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible()
}

export async function logout(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).click()
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click()
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible()
}

/**
 * Dépose la pièce d'essai et attend qu'elle soit lue par le worker. Déposée de nouveau par un
 * autre parcours, elle est reconnue comme doublon exact : elle se cite alors comme l'original.
 */
export async function depositFixture(page: Page, file = FIXTURE) {
  const name = path.basename(file)
  await page.goto("/documents")
  await page.getByRole("button", { name: "Déposer des documents" }).first().click()
  await page.locator('input[type="file"]').setInputFiles(file)
  await expect(page.getByRole("list", { name: "Dépôts" }).getByText("Reçu, traitement en cours")).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(`Lecture de « ${name} »`).first()).toBeVisible({ timeout: 60_000 })
}

export const WORD_FORM = path.join(import.meta.dirname, "fixtures", "Formulaire TECH-1 essai.docx")

/** Clé de la double authentification du chef de département et de l'administrateur des parcours (tests/e2e/seed.py). */
const CHEF_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

/**
 * Connexion du chef de département, code compris. Un code déjà servi est refusé par le serveur :
 * en cas de refus, on attend la période suivante de 30 secondes et on réessaie.
 */
export async function loginAsChef(page: Page, email = "e2e-chef@sifec.test") {
  await page.getByLabel("Adresse électronique").fill(email)
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Se connecter" }).click()
  await expect(page.getByRole("heading", { name: "Code de vérification" })).toBeVisible()
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.getByLabel("Code à 6 chiffres").fill(totp(CHEF_SECRET))
    await page.getByRole("button", { name: "Vérifier le code" }).click()
    const done = await page
      .getByRole("navigation", { name: "Navigation principale" })
      .waitFor({ timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (done) return
    await page.waitForTimeout(31_000 - (Date.now() % 30_000))
  }
  await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible()
}

/** Connexion de l'administrateur technique des parcours, code compris. */
export const loginAsAdmin = (page: Page) => loginAsChef(page, "e2e-admin@sifec.test")
