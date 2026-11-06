import { createContext, useCallback, useContext, useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type ConfirmRequest = {
  title: string
  /** Ce que l'action change, et si on peut revenir en arrière. */
  description: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: "default" | "danger"
  /** Motif journalisé avec l'action (renvoi pour correction, écart de prix, archivage). */
  reason?: { label: string; minLength?: number; placeholder?: string }
}

export type ConfirmResult = { reason: string } | null

type Pending = ConfirmRequest & { resolve: (result: ConfirmResult) => void }

const ConfirmContext = createContext<((request: ConfirmRequest) => Promise<ConfirmResult>) | null>(null)

/**
 * Confirmation des actions irréversibles : validation, export, archivage, renvoi. Rend une
 * promesse : `null` si la personne renonce, sinon le motif saisi.
 */
export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error("useConfirm demande ConfirmProvider.")
  return confirm
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const [reason, setReason] = useState("")
  const resolved = useRef(false)
  const id = useId()

  const confirm = useCallback(
    (request: ConfirmRequest) =>
      new Promise<ConfirmResult>((resolve) => {
        resolved.current = false
        setReason("")
        setPending({ ...request, resolve })
      }),
    [],
  )

  const close = (result: ConfirmResult) => {
    if (!pending || resolved.current) return
    resolved.current = true
    pending.resolve(result)
    setPending(null)
  }

  const minimum = pending?.reason ? (pending.reason.minLength ?? 1) : 0
  const ready = reason.trim().length >= minimum

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && close(null)}>
        {pending ? (
          <DialogContent showCloseButton={false} className="sm:max-w-md">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (ready) close({ reason: reason.trim() })
              }}
            >
              <DialogHeader>
                <DialogTitle>{pending.title}</DialogTitle>
                <DialogDescription asChild>
                  <div className="text-[0.8125rem] text-ink-muted">{pending.description}</div>
                </DialogDescription>
              </DialogHeader>
              {pending.reason ? (
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor={`${id}-reason`}>{pending.reason.label}</Label>
                  <Textarea
                    id={`${id}-reason`}
                    rows={3}
                    value={reason}
                    autoFocus
                    placeholder={pending.reason.placeholder ?? "Ce motif est journalisé avec l'action."}
                    onChange={(event) => setReason(event.target.value)}
                    aria-required="true"
                  />
                  {minimum > 1 ? (
                    <p className="tabular text-xs text-ink-muted">
                      {Math.max(0, minimum - reason.trim().length)
                        ? `Encore ${minimum - reason.trim().length} caractère(s) au moins.`
                        : "Motif suffisant."}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <DialogFooter className="mt-6">
                <Button type="button" variant="ghost" onClick={() => close(null)}>
                  {pending.cancelLabel ?? "Annuler"}
                </Button>
                <Button
                  type="submit"
                  variant={pending.tone === "danger" ? "destructive" : "default"}
                  disabled={!ready}
                  autoFocus={!pending.reason}
                >
                  {pending.confirmLabel}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </ConfirmContext.Provider>
  )
}
