import { describe, expect, it } from "vitest"

import { navFor } from "./navigation"
import { hasAccess } from "./roles"

const labels = (role: Parameters<typeof navFor>[0], grants: string[] = []) => navFor(role, { grants }).flatMap((group) => group.items.map((item) => item.label))

describe("menu et délégations", () => {
  it("réserve la tarification au chef de département", () => {
    expect(labels("chef_departement")).toContain("Tarification")
    expect(labels("chef_pole")).not.toContain("Tarification")
  })

  it("ouvre la tarification à un délégué qui la consulte ou la modifie", () => {
    expect(labels("chef_pole", ["pricing.view"])).toContain("Tarification")
    expect(labels("collaborateur", ["pricing.edit"])).toContain("Tarification")
    expect(labels("collaborateur", ["workflow.ddp.prix_final"])).not.toContain("Tarification")
  })

  it("montre les délégations à chacun, les paramètres au seul chef de département", () => {
    expect(labels("collaborateur")).toContain("Délégations")
    expect(labels("admin_technique")).toContain("Délégations")
    expect(labels("chef_pole")).not.toContain("Paramètres")
  })

  it("refuse l'accès d'un compte désactivé, même délégué", () => {
    const user = { role: "collaborateur" as const, is_active: true }
    expect(hasAccess(user, ["chef_departement"], ["pricing.view"], ["pricing.view"])).toBe(true)
    expect(hasAccess({ ...user, is_active: false }, ["chef_departement"], ["pricing.view"], ["pricing.view"])).toBe(false)
    expect(hasAccess(user, ["chef_departement"], ["pricing.view"], [])).toBe(false)
  })
})
