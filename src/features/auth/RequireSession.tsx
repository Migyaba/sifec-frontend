import { Loader2, RotateCcw, ServerCrash } from "lucide-react"
import { Navigate, useLocation } from "react-router"

import { userMessage } from "@/api"
import { BrandMark } from "@/components/sifec/brand"
import { Button } from "@/components/ui/button"

import { gateOf, useSession, type Session } from "./api"
import { GATE_PATH } from "./useGate"

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-svh place-items-center px-6 text-center">{children}</div>
}

/**
 * Garde des écrans de l'application : sans session complète (connexion, puis code si le rôle
 * l'exige), la personne est envoyée à l'étape qui manque, et revient ensuite à la page demandée.
 */
export function RequireSession({ children }: { children: (session: Session) => React.ReactNode }) {
  const session = useSession()
  const location = useLocation()
  const gate = gateOf(session.data, session.error)

  if (gate && gate !== "open") {
    return <Navigate to={GATE_PATH[gate]} replace state={{ from: location.pathname + location.search }} />
  }
  if (gate === "open" && session.data) return children(session.data)
  if (session.isError) {
    return (
      <Centered>
        <div className="max-w-sm">
          <ServerCrash className="mx-auto size-8 text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ink">Impossible de vérifier votre session</p>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">{userMessage(session.error)}</p>
          <Button variant="outline" className="mt-4" onClick={() => void session.refetch()}>
            <RotateCcw data-icon="inline-start" aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      </Centered>
    )
  }
  return (
    <Centered>
      <div className="flex flex-col items-center gap-3" role="status">
        <BrandMark className="size-10" />
        <span className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Ouverture de SIFEC Offrea
        </span>
      </div>
    </Centered>
  )
}
