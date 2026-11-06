import { describe, expect, it } from "vitest"

import { ApiError, NetworkError, fieldErrors, userMessage } from "./errors"
import { shouldRetry } from "./query"

describe("fieldErrors", () => {
  it("met à plat les champs, les éléments de liste et les erreurs générales", () => {
    const details = {
      name: ["Indiquez le nom."],
      experiences: [{}, { employer: ["Employeur inconnu."] }],
      non_field_errors: ["La fiche est verrouillée."],
    }

    expect(fieldErrors(details)).toEqual({
      name: ["Indiquez le nom."],
      "experiences.1.employer": ["Employeur inconnu."],
      non_field_errors: ["La fiche est verrouillée."],
    })
  })

  it("range une liste de messages sans champ dans les erreurs générales", () => {
    expect(fieldErrors(["Aucun dossier du jeu de test n'est verrouillé."])).toEqual({
      non_field_errors: ["Aucun dossier du jeu de test n'est verrouillé."],
    })
  })
})

describe("ApiError", () => {
  it("lit la forme commune des erreurs", () => {
    const error = ApiError.from(400, { error: { code: "invalid", message: "Non valide.", details: { a: ["b"] } } })

    expect([error.status, error.code, error.details]).toEqual([400, "invalid", { a: ["b"] }])
  })

  it("ne fait pas confiance à un corps inattendu", () => {
    expect(ApiError.from(502, "<html>").code).toBe("unexpected")
  })
})

describe("userMessage", () => {
  it("dit qu'une coupure ne perd rien", () => {
    expect(userMessage(new NetworkError())).toContain("rien n'a été perdu")
  })

  it("ne dit pas si un objet introuvable existe", () => {
    expect(userMessage(new ApiError(404, "not_found", "Introuvable."))).toContain("ou vous n'y avez pas accès")
  })
})

describe("shouldRetry", () => {
  it("réessaie le réseau et le serveur, pas la demande", () => {
    expect(shouldRetry(0, new NetworkError())).toBe(true)
    expect(shouldRetry(0, new ApiError(503, "unavailable", ""))).toBe(true)
    expect(shouldRetry(0, new ApiError(400, "invalid", ""))).toBe(false)
    expect(shouldRetry(0, new ApiError(403, "permission_denied", ""))).toBe(false)
    expect(shouldRetry(2, new NetworkError())).toBe(false)
  })
})
