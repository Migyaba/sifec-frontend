import { Construction, Lock, SearchX } from "lucide-react"
import { Link } from "react-router"

import type { NavItem } from "@/app/navigation"
import { Button } from "@/components/ui/button"

function Status({ icon: Icon, title, children }: { icon: typeof Lock; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[76rem] px-6 pt-8 pb-24 lg:px-10">
      <div className="grid place-items-center rounded-xl bg-card px-6 py-16 text-center ring-1 ring-line">
        <Icon className="size-8 text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
        <h1 className="mt-3 text-lg font-extrabold text-ink">{title}</h1>
        <div className="mt-1 max-w-[56ch] text-[0.8125rem] text-ink-muted">{children}</div>
      </div>
    </div>
  )
}

/** Écran du menu dont le lot n'est pas encore construit. */
export function PlannedPage({ item }: { item: NavItem }) {
  return (
    <Status icon={Construction} title={item.label}>
      Cet écran arrive au lot {item.lot} du plan de l'interface. L'API correspondante est déjà en place.
    </Status>
  )
}

export function ForbiddenPage() {
  return (
    <Status icon={Lock} title="Accès réservé">
      Votre rôle ne donne pas accès à cet écran. Si vous en avez besoin, demandez au chef de département.
    </Status>
  )
}

export function NotFoundPage({ home }: { home: string }) {
  return (
    <Status icon={SearchX} title="Page introuvable">
      <p>L'adresse ne correspond à aucun écran.</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to={home}>Revenir à l'accueil</Link>
      </Button>
    </Status>
  )
}
