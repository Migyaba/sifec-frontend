import path from "node:path"

import { expect, type Page } from "@playwright/test"

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

/** Dépose la pièce d'essai et attend qu'elle soit lue par le worker. */
export async function depositFixture(page: Page) {
  await page.goto("/documents")
  await page.getByRole("button", { name: "Déposer des documents" }).first().click()
  await page.locator('input[type="file"]').setInputFiles(FIXTURE)
  const row = page.getByRole("row", { name: /Attestation bonne execution 2025/ }).first()
  await expect(row.getByText("Prêt")).toBeVisible({ timeout: 60_000 })
}
