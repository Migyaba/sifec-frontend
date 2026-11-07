import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderApp } from "@/test/render"
import { fakeServer, json, session, UNAUTHENTICATED } from "@/test/server"

import { secretOf } from "./pages/OtpSetupPage"

afterEach(() => vi.unstubAllGlobals())

describe("garde de session", () => {
  it("envoie vers la connexion, puis ramène à la page demandée", async () => {
    let logged = false
    fakeServer({
      "GET /api/v1/auth/session/": () => (logged ? json(200, session("chef_pole")) : UNAUTHENTICATED.clone()),
      "GET /api/v1/auth/csrf/": json(200),
      "POST /api/v1/auth/login/": () => {
        logged = true
        return json(200, session("chef_pole"))
      },
    })
    renderApp("/experts")

    expect(await screen.findByRole("heading", { name: "Connexion" })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Adresse électronique"), "pole@sifec.test")
    await userEvent.type(screen.getByLabelText("Mot de passe"), "secret")
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }))

    expect(await screen.findByRole("heading", { name: "Experts" })).toBeInTheDocument()
  })

  it("dit qu'un identifiant est faux sans dire lequel", async () => {
    fakeServer({
      "GET /api/v1/auth/session/": UNAUTHENTICATED,
      "GET /api/v1/auth/csrf/": json(200),
      "POST /api/v1/auth/login/": json(400, { error: { code: "invalid_credentials", message: "Identifiants invalides." } }),
    })
    renderApp("/connexion")

    await userEvent.type(await screen.findByLabelText("Adresse électronique"), "pole@sifec.test")
    await userEvent.type(screen.getByLabelText("Mot de passe"), "faux")
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Adresse ou mot de passe incorrect.")
  })

  it("demande le code quand le rôle l'exige", async () => {
    let verified = false
    fakeServer({
      "GET /api/v1/auth/session/": () =>
        json(200, session("chef_pole", { required: true, enrolled: true, verified })),
      "GET /api/v1/auth/csrf/": json(200),
      "POST /api/v1/auth/otp/verify/": async (request) => {
        const { token } = (await request.json()) as { token: string }
        if (token !== "123456") return json(400, { error: { code: "invalid_token", message: "Code invalide." } })
        verified = true
        return json(200, session("chef_pole", { required: true, enrolled: true, verified }))
      },
    })
    renderApp("/dossiers")

    const field = await screen.findByLabelText("Code à 6 chiffres")
    await userEvent.type(field, "000000")
    await userEvent.click(screen.getByRole("button", { name: "Vérifier le code" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Code incorrect")

    await userEvent.clear(field)
    await userEvent.type(field, "123456")
    await userEvent.click(screen.getByRole("button", { name: "Vérifier le code" }))
    expect(await screen.findByRole("heading", { name: "Avis et dossiers" })).toBeInTheDocument()
  })

  it("fait activer la double authentification et montre les codes de secours une fois", async () => {
    let enrolled = false
    const server = fakeServer({
      "GET /api/v1/auth/session/": () =>
        json(200, session("chef_pole", { required: true, enrolled, verified: enrolled })),
      "GET /api/v1/auth/csrf/": json(200),
      "POST /api/v1/auth/otp/setup/": json(200, {
        config_url: "otpauth://totp/SIFEC:pole?secret=JBSWY3DPEHPK3PXP&issuer=SIFEC",
      }),
      "POST /api/v1/auth/otp/confirm/": () => {
        enrolled = true
        return json(200, { recovery_codes: ["a1b2c3d4", "e5f6g7h8"] })
      },
    })
    renderApp("/tableau-de-bord")

    expect(await screen.findByRole("heading", { name: "Activer la double authentification" })).toBeInTheDocument()
    expect(await screen.findByText("JBSW Y3DP EHPK 3PXP")).toBeInTheDocument()
    expect(server.calls.filter((call) => call === "POST /api/v1/auth/otp/setup/")).toHaveLength(1)

    await userEvent.type(screen.getByLabelText("Code à 6 chiffres"), "123456")
    await userEvent.click(screen.getByRole("button", { name: "Activer" }))

    expect(await screen.findByText("a1b2c3d4")).toBeInTheDocument()
    const proceed = screen.getByRole("button", { name: "Accéder à l'application" })
    expect(proceed).toBeDisabled()
    await userEvent.click(screen.getByRole("checkbox"))
    await userEvent.click(proceed)

    expect(await screen.findByRole("heading", { level: 1, name: "Bonjour Aurel" })).toBeInTheDocument()
  })
})

describe("menu et droits", () => {
  it("ne montre à l'administrateur technique aucun écran de contenu", async () => {
    fakeServer({ "GET /api/v1/auth/session/": json(200, session("admin_technique")) })
    renderApp("/")

    const nav = await screen.findByRole("navigation", { name: "Navigation principale" })
    expect(within(nav).getByRole("link", { name: "Comptes et rôles" })).toBeInTheDocument()
    expect(within(nav).getByRole("link", { name: "Journal des actions" })).toBeInTheDocument()
    expect(within(nav).queryByRole("link", { name: "Avis et dossiers" })).not.toBeInTheDocument()
    expect(await screen.findByRole("heading", { name: "Comptes et rôles" })).toBeInTheDocument()
  })

  it("refuse un écran hors du rôle, même par son adresse", async () => {
    fakeServer({ "GET /api/v1/auth/session/": json(200, session("collaborateur")) })
    renderApp("/journal")

    expect(await screen.findByRole("heading", { name: "Accès réservé" })).toBeInTheDocument()
    const nav = screen.getByRole("navigation", { name: "Navigation principale" })
    expect(within(nav).queryByRole("link", { name: "Journal des actions" })).not.toBeInTheDocument()
  })

  it("déconnecte et renvoie vers la connexion", async () => {
    let logged = true
    fakeServer({
      "GET /api/v1/auth/session/": () => (logged ? json(200, session("chef_pole")) : UNAUTHENTICATED.clone()),
      "GET /api/v1/auth/csrf/": json(200),
      "POST /api/v1/auth/logout/": () => {
        logged = false
        return new Response(null, { status: 204 })
      },
    })
    renderApp("/experts")

    await userEvent.click(await screen.findByRole("button", { name: /Aurel Kpadonou/ }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Se déconnecter" }))

    await waitFor(() => expect(screen.getByRole("heading", { name: "Connexion" })).toBeInTheDocument())
  })
})

describe("secretOf", () => {
  it("lit la clé de l'adresse otpauth par groupes de quatre", () => {
    expect(secretOf("otpauth://totp/x?secret=ABCDEFGH12")).toBe("ABCD EFGH 12")
    expect(secretOf("pas une adresse")).toBeNull()
  })
})
