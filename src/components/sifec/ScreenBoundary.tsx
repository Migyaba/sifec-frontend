import { RotateCcw, TriangleAlert } from "lucide-react"
import { Component, type ErrorInfo, type ReactNode } from "react"

import { Button } from "@/components/ui/button"

/**
 * Une erreur dans un écran ne doit jamais laisser une page blanche : le menu reste, l'écran dit
 * ce qui s'est passé et propose de recharger. La clé (l'adresse) remet l'écran à zéro.
 */
export class ScreenBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur d'écran", error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="px-[3%] pt-8">
        <div role="alert" className="grid place-items-center rounded-xl bg-card px-6 py-14 text-center ring-1 ring-line">
          <TriangleAlert className="size-8 text-check" strokeWidth={1.75} aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ink">Cet écran a rencontré une erreur</p>
          <p className="mt-1 max-w-[56ch] text-[0.8125rem] text-ink-muted">
            Rien n'a été enregistré à votre insu. Rechargez l'écran ; si l'erreur revient, prévenez l'administrateur.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            <RotateCcw data-icon="inline-start" aria-hidden="true" />
            Recharger l'écran
          </Button>
        </div>
      </div>
    )
  }
}
