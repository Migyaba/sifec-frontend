import { describe, expect, it } from "vitest"

import type { Step } from "./api"
import { daysLeft, decisionRight, performer, stepState } from "./labels"

const step = (values: Partial<Step>): Step => ({
  key: "go_no_go",
  label: "Décision Go / No-Go",
  kind: "validation",
  status: "pending",
  actionable: false,
  roles: ["chef_departement"],
  invalidated_reason: "",
  done_at: null,
  fingerprints: {},
  ...values,
})

describe("parcours du dossier", () => {
  it("montre l'état de chaque étape", () => {
    expect(stepState(step({ status: "done" }))).toBe("done")
    expect(stepState(step({ status: "invalidated", actionable: true }))).toBe("reopened")
    expect(stepState(step({ actionable: true }))).toBe("current")
    expect(stepState(step({}))).toBe("todo")
  })

  it("nomme qui fait l'étape", () => {
    expect(performer(step({}))).toBe("Chef de département")
    expect(performer(step({ key: "validation_exigences", roles: ["chef_pole", "chef_departement"] }))).toBe("Chef de pôle")
    expect(performer(step({ key: "extraction", kind: "task", roles: [] }))).toBe("Plateforme")
    expect(performer(step({ key: "choix_contenus", kind: "task", roles: [] }))).toBe("Équipe du dossier")
  })

  it("donne le droit de décider par le rôle ou par une délégation écrite de cette validation", () => {
    const go = step({ actionable: true })
    expect(decisionRight({ role: "chef_departement" }, "ami", go, [])).toBe("role")
    expect(decisionRight({ role: "chef_pole" }, "ami", go, [])).toBeNull()
    expect(decisionRight({ role: "chef_pole" }, "ami", go, ["workflow.ami.go_no_go"])).toBe("delegation")
    expect(decisionRight({ role: "chef_pole" }, "ddp", go, ["workflow.ami.go_no_go"])).toBeNull()
    expect(decisionRight(undefined, "ami", go, [])).toBeNull()
  })

  it("compte les jours civils jusqu'à la date limite", () => {
    const today = new Date(2026, 10, 7, 18, 0)
    expect(daysLeft(new Date(2026, 10, 10, 9, 0).toISOString(), today)).toBe(3)
    expect(daysLeft(new Date(2026, 10, 7, 23, 0).toISOString(), today)).toBe(0)
  })
})
