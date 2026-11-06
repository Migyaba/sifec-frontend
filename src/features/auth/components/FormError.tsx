import { OctagonX } from "lucide-react"

/** Erreur d'un formulaire de connexion, annoncée aux lecteurs d'écran. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg bg-block-soft px-3 py-2.5 text-[0.8125rem] font-semibold text-block">
      <OctagonX className="mt-px size-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      {message}
    </div>
  )
}
