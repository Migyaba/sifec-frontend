import { useMutation } from "@tanstack/react-query"
import { Download, FlaskConical } from "lucide-react"
import { useState } from "react"

import { api, call, userMessage } from "@/api"
import { Notice } from "@/components/sifec/notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Expected = { key?: string; label?: string }

const WORD = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

/**
 * Essai de remplissage d'un formulaire type, avec des valeurs d'essai : rien n'est enregistré.
 * Le compte rendu dit ce qui a été rempli et ce qui manque, et le fichier se télécharge.
 */
export function FormPreview({ templateId, expected }: { templateId: string; expected: unknown }) {
  const fields = (Array.isArray(expected) ? (expected as Expected[]) : []).filter((field) => field.key)
  const [values, setValues] = useState<Record<string, string>>({})
  const preview = useMutation({
    mutationFn: () => call(api.POST("/api/v1/form-templates/{id}/preview/", { params: { path: { id: templateId } }, body: { values } })),
  })
  const download = () => {
    if (!preview.data) return
    const bytes = Uint8Array.from(atob(preview.data.document), (char) => char.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes], { type: WORD }))
    Object.assign(document.createElement("a"), { href: url, download: preview.data.filename }).click()
    URL.revokeObjectURL(url)
  }
  const report = preview.data?.report

  return (
    <section aria-labelledby={`${templateId}-essai`} className="rounded-xl bg-card ring-1 ring-line">
      <h2 id={`${templateId}-essai`} className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-extrabold text-ink">
        <FlaskConical className="size-4 text-blue-600" aria-hidden="true" />
        Essai de remplissage
      </h2>
      <div className="space-y-3 px-4 py-3">
        {fields.length ? (
          <>
            <p className="text-xs text-ink-muted">Des valeurs d'essai, pour vérifier les règles avant qu'un dossier ne s'en serve. Rien n'est enregistré.</p>
            {fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={`essai-${field.key}`}>{field.label || field.key}</Label>
                <Input id={`essai-${field.key}`} value={values[field.key as string] ?? ""} onChange={(event) => setValues({ ...values, [field.key as string]: event.target.value })} />
              </div>
            ))}
            <Button variant="outline" disabled={preview.isPending} onClick={() => preview.mutate()}>
              <FlaskConical data-icon="inline-start" aria-hidden="true" />
              Remplir pour essai
            </Button>
          </>
        ) : (
          <p className="text-[0.8125rem] text-ink-muted">Aucun champ attendu : décrivez d'abord les champs du formulaire.</p>
        )}
        {preview.isError ? <Notice tone="block" title="Essai impossible">{userMessage(preview.error)}</Notice> : null}
        {report ? (
          <Notice
            tone={report.complete ? "info" : "check"}
            title={report.complete ? "Formulaire rempli entièrement" : "Formulaire rempli en partie"}
            action={
              <Button size="sm" variant="outline" onClick={download}>
                <Download data-icon="inline-start" aria-hidden="true" />
                Télécharger
              </Button>
            }
          >
            {report.filled} zone(s) remplie(s), {report.deleted} supprimée(s)
            {report.brackets_left ? `, ${report.brackets_left} crochet(s) restant(s)` : ""}
            {report.missing.length ? `. Valeurs manquantes : ${report.missing.join(", ")}.` : "."}
          </Notice>
        ) : null}
      </div>
    </section>
  )
}
