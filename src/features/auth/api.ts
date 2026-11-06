import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, ApiError, call, type components } from "@/api"

export type Session = components["schemas"]["Session"]

export const sessionKey = ["auth", "session"] as const

/** Session en cours : utilisateur, rôle, et état de la double authentification. */
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: () => call(api.GET("/api/v1/auth/session/")),
    retry: false,
    staleTime: 5 * 60_000,
  })
}

/** Ce que la session demande avant d'ouvrir l'application. */
export type Gate = "login" | "enroll" | "verify" | "open"

export function gateOf(session: Session | undefined, error: unknown): Gate | null {
  if (error instanceof ApiError && error.status === 401) return "login"
  if (!session) return null
  if (session.otp_required && !session.otp_enrolled) return "enroll"
  if (session.otp_required && !session.otp_verified) return "verify"
  return "open"
}

export function useLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: components["schemas"]["LoginRequest"]) =>
      call(api.POST("/api/v1/auth/login/", { body })),
    onSuccess: (session) => {
      // Une autre personne a pu travailler dans ce navigateur : on repart de zéro.
      client.clear()
      client.setQueryData(sessionKey, session)
    },
  })
}

export function useOtpVerify() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => call(api.POST("/api/v1/auth/otp/verify/", { body: { token } })),
    onSuccess: (session) => client.setQueryData(sessionKey, session),
  })
}

export function useOtpSetup() {
  return useMutation({
    mutationFn: () => call(api.POST("/api/v1/auth/otp/setup/")),
  })
}

export function useOtpConfirm() {
  return useMutation({
    mutationFn: (token: string) => call(api.POST("/api/v1/auth/otp/confirm/", { body: { token } })),
  })
}

export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => call(api.POST("/api/v1/auth/logout/")),
    onSettled: () => {
      client.clear()
      client.setQueryData(sessionKey, undefined)
      void client.invalidateQueries({ queryKey: sessionKey })
    },
  })
}

/** Message d'un échec de connexion ou de code, dans les mots de l'écran. */
export function authMessage(error: unknown): string | null {
  if (!error) return null
  if (error instanceof ApiError) {
    if (error.code === "invalid_credentials") return "Adresse ou mot de passe incorrect."
    if (error.code === "invalid_token") return "Code incorrect ou expiré. Saisissez le code affiché maintenant."
    // Après un code faux, le serveur bloque quelques secondes, même le bon code : il dit combien.
    if (error.code === "otp_throttled") return error.message
    if (error.status === 429) return "Trop de tentatives. Patientez quelques minutes avant de réessayer."
    if (error.status === 400) return "Vérifiez les champs signalés."
  }
  if (error instanceof Error && error.name === "NetworkError") {
    return "Le serveur ne répond pas. Vérifiez la connexion, puis réessayez."
  }
  return "La connexion a échoué. Réessayez ; si le problème persiste, prévenez l'administrateur."
}
