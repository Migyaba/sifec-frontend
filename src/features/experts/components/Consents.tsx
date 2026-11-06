import { Plus, X } from "lucide-react"
import { useState } from "react"

import { ApiError, fieldErrors, userMessage } from "@/api"
import { useConfirm } from "@/components/confirm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DocumentPicker } from "@/features/records"

import { useConsentMutations, useConsents } from "../api"

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })
const fmt = (value?: string | null) => (value ? day.format(new Date(`${value}T12:00:00`)) : "")
const today = () => new Date().toISOString().slice(0, 10)

/**
 * Accord écrit de l'expert pour l'usage de son CV (UC05) : sans accord valable, son CV n'est
 * jamais exporté. L'accord est une pièce signée de la base, avec sa date.
 */
export function Consents({ expertId, editable }: { expertId: string; editable: boolean }) {
  const consents = useConsents(expertId)
  const { add, withdraw } = useConsentMutations(expertId)
  const confirm = useConfirm()
  const [adding, setAdding] = useState(false)
  const [picked, setPicked] = useState<{ versionId: string; title: string; pages: number } | null>(null)
  const [signedOn, setSignedOn] = useState(today())
  const errors = add.error instanceof ApiError && add.error.code === "invalid" ? Object.values(fieldErrors(add.error.details)).flat().join(" ") : add.error ? userMessage(add.error) : ""
  const rows = consents.data ?? []

  return (
    <section aria-labelledby="accords-title" className="rounded-xl bg-card ring-1 ring-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="accords-title" className="text-sm font-extrabold text-ink">
          Accord pour l'usage du CV
        </h2>
        {editable && !adding ? (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Enregistrer un accord
          </Button>
        ) : null}
      </div>
      {adding ? (
        <form
          className="space-y-3 border-b border-line p-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!picked) return
            add.mutate(
              { document_version_id: picked.versionId, signed_on: signedOn },
              {
                onSuccess: () => {
                  setAdding(false)
                  setPicked(null)
                },
              },
            )
          }}
        >
          <p className="text-xs text-ink-muted">Choisissez l'accord signé, déposé dans les documents, et sa date de signature.</p>
          <DocumentPicker picked={picked} onPick={setPicked} />
          <div className="space-y-1">
            <Label htmlFor="signed-on">Signé le</Label>
            <Input id="signed-on" type="date" value={signedOn} onChange={(event) => setSignedOn(event.target.value)} className="w-[min(11rem,100%)]" />
          </div>
          {errors ? (
            <p role="alert" className="text-xs font-semibold text-block">
              {errors}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={!picked || !signedOn || add.isPending}>
              Enregistrer l'accord
            </Button>
          </div>
        </form>
      ) : null}
      {consents.isSuccess && !rows.length && !adding ? (
        <p className="px-4 py-3 text-[0.8125rem] text-ink-muted">Aucun accord enregistré : le CV de cet expert ne peut pas être exporté.</p>
      ) : null}
      <ul className="divide-y divide-line">
        {rows.map((consent) => (
          <li key={consent.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-[0.8125rem]">
            <span className="flex-1">
              Signé le {fmt(consent.signed_on)}
              {consent.withdrawn_on ? (
                <span className="font-semibold text-block">
                  {" "}
                  · retiré le {fmt(consent.withdrawn_on)}
                  {consent.withdrawal_note ? ` (${consent.withdrawal_note})` : ""}
                </span>
              ) : null}
            </span>
            {editable && !consent.withdrawn_on ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const answer = await confirm({
                    title: "Enregistrer le retrait de l'accord ?",
                    description: "À partir d'aujourd'hui, le CV de cet expert ne pourra plus être exporté.",
                    confirmLabel: "Enregistrer le retrait",
                    tone: "danger",
                    reason: { label: "Note sur le retrait", minLength: 3 },
                  })
                  if (answer) withdraw.mutate({ consentId: consent.id, withdrawn_on: today(), note: answer.reason })
                }}
              >
                <X data-icon="inline-start" aria-hidden="true" />
                Retrait
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
