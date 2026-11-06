import { OctagonX } from "lucide-react"
import { cloneElement, isValidElement, useId } from "react"
import { useFormContext, type FieldValues } from "react-hook-form"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { ROOT_ERROR } from "./serverErrors"

type Path = string

function errorAt(errors: FieldValues, path: Path): string | undefined {
  const found = path.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], errors)
  const message = (found as { message?: unknown } | undefined)?.message
  return typeof message === "string" ? message : undefined
}

/**
 * Champ de formulaire : libellé au-dessus, aide en dessous, erreur qui dit quoi corriger.
 * L'enfant reçoit son identifiant et ses attributs d'accessibilité.
 */
export function Field({
  name,
  label,
  help,
  required = false,
  children,
  className,
}: {
  name: Path
  label: string
  help?: string
  required?: boolean
  children: React.ReactElement<Record<string, unknown>>
  className?: string
}) {
  const id = useId()
  const {
    formState: { errors },
  } = useFormContext()
  const error = errorAt(errors, name)
  const helpId = help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-block" aria-hidden="true"> *</span> : null}
      </Label>
      {isValidElement(children)
        ? cloneElement(children, {
            id,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": describedBy,
            "aria-required": required || undefined,
          })
        : children}
      {error ? (
        <p id={errorId} className="text-xs font-semibold text-block">
          {error}
        </p>
      ) : null}
      {help ? (
        <p id={helpId} className="text-xs text-ink-muted">
          {help}
        </p>
      ) : null}
    </div>
  )
}

/** Erreur générale du formulaire, en tête, annoncée aux lecteurs d'écran. */
export function FormAlert() {
  const {
    formState: { errors },
  } = useFormContext()
  const message = errorAt(errors, ROOT_ERROR)
  if (!message) return null
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg bg-block-soft px-3 py-2.5 text-[0.8125rem] font-semibold text-block">
      <OctagonX className="mt-px size-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      {message}
    </div>
  )
}
