import { describe, expect, it } from "vitest"

import { defaultsOf, displayValue, payloadOf, type FieldDef } from "./fields"

const DEFS: FieldDef[] = [
  { name: "title", label: "Intitulé", kind: "text" },
  { name: "level", label: "Niveau", kind: "select", options: { master: "Master" } },
  { name: "obtained_year", label: "Année", kind: "year" },
  { name: "expires_on", label: "Expiration", kind: "date" },
  { name: "mother_tongue", label: "Langue maternelle", kind: "boolean" },
]

describe("champs de fiche", () => {
  it("envoie des nombres, des dates nulles, et omet les choix vides", () => {
    const values = { title: "Master", level: "", obtained_year: "2012", expires_on: "", mother_tongue: false }
    expect(payloadOf(DEFS, values)).toEqual({ title: "Master", obtained_year: 2012, expires_on: null, mother_tongue: false })
  })

  it("omet un texte vide à la création, mais le transmet en modification", () => {
    const values = { title: "", level: "", obtained_year: "", expires_on: "", mother_tongue: false }
    expect(payloadOf(DEFS, values)).not.toHaveProperty("title")
    expect(payloadOf(DEFS, values, { title: true })).toEqual({ title: "" })
  })

  it("n'envoie en modification que les champs changés", () => {
    const values = defaultsOf(DEFS, { title: "Master", level: "master", obtained_year: 2012 })
    expect(payloadOf(DEFS, { ...values, obtained_year: "2013" }, { obtained_year: true })).toEqual({ obtained_year: 2013 })
  })

  it("affiche les valeurs dans les mots de l'écran", () => {
    expect(displayValue(DEFS[1], "master")).toBe("Master")
    expect(displayValue(DEFS[3], "2026-03-12")).toBe("12 mars 2026")
    expect(displayValue(DEFS[4], true)).toBe("Oui")
    expect(displayValue(DEFS[0], "")).toBe("")
  })
})
