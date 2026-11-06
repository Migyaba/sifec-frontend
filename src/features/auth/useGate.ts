import { useLocation } from "react-router"

import { homeFor } from "@/app/navigation"

import { gateOf, useSession, type Gate } from "./api"

export const GATE_PATH: Record<Exclude<Gate, "open">, string> = {
  login: "/connexion",
  enroll: "/connexion/activation",
  verify: "/connexion/code",
}

/** Où la session envoie la personne, et la page qu'elle demandait avant la connexion. */
export function useGate() {
  const session = useSession()
  const location = useLocation()
  const gate = gateOf(session.data, session.error)
  const from = (location.state as { from?: string } | null)?.from
  let target: string | null = null
  if (gate === "open") target = session.data ? (from ?? homeFor(session.data.user.role)) : null
  else if (gate) target = GATE_PATH[gate]
  return { session, gate, target, from }
}
