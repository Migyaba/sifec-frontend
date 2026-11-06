import { useMutation, useQuery } from "@tanstack/react-query"
import { Sparkles, X } from "lucide-react"
import { useState } from "react"
import { FormProvider, useForm } from "react-hook-form"

import { api, call, userMessage, type components } from "@/api"
import { applyServerErrors, FormAlert } from "@/components/forms"
import { Notice } from "@/components/sifec/notice"
import { track } from "@/components/tasks"
import { Button } from "@/components/ui/button"

import { defaultsOf, FieldControl, payloadOf, type FieldDef, type FormValues } from "../fields"
import { DocumentPicker } from "./ProofPanel"

type Run = components["schemas"]["PrefillRun"]
type Report = { filled?: string[]; skipped?: { field: string; value: string; reason: string }[]; items?: Record<string, number>; evidence?: Record<string, number> }

function reportOf(run: Run): Report {
  return (run.report ?? {}) as Report
}

/** Compte rendu en une phrase : ce que l'IA a rempli, et le rappel que tout reste à vérifier. */
export function summaryOf(report: Report): string {
  const fields = report.filled?.length ?? 0
  const items = Object.values(report.items ?? {}).reduce((sum, count) => sum + count, 0)
  const proofs = Object.values(report.evidence ?? {}).reduce((sum, count) => sum + count, 0)
  return `${fields} champ(s) rempli(s), ${items} élément(s) ajouté(s), ${proofs} preuve(s) rattachée(s). Tout reste à vérifier par une autre personne.`
}

/**
 * Préremplissage par l'IA à partir d'une pièce (synthèse, §4.1) : nouvelle fiche depuis la liste,
 * ou champs vides d'une fiche existante. Une saisie humaine n'est jamais écrasée ; chaque valeur
 * citée garde sa preuve d'origine « IA », orange tant qu'une autre personne n'a pas vérifié.
 */
export function PrefillPanel({
  recordType,
  route,
  recordId,
  defaults = [],
  hint,
  onClose,
  onDone,
}: {
  recordType: string
  route: string
  recordId?: string
  /** Champs que l'IA ne choisit pas, indiqués au lancement (l'entité, le type de pièce…). */
  defaults?: FieldDef[]
  hint: string
  onClose: () => void
  /** Appelé à la fin du préremplissage : la liste ou la fiche se relit. */
  onDone?: () => void
}) {
  const [picked, setPicked] = useState<{ versionId: string; title: string; pages: number } | null>(null)
  const [started, setStarted] = useState(false)
  const form = useForm<FormValues>({ defaultValues: defaultsOf(defaults) })
  const start = useMutation({
    mutationFn: (body: components["schemas"]["PrefillRequestRequest"]) =>
      call(api.POST("/api/v1/records/{record_type}/prefill/", { params: { path: { record_type: recordType } }, body })),
    onSuccess: (run) => {
      setStarted(true)
      track({
        id: `prefill-${run.id}`,
        label: `Préremplissage par l'IA${picked ? ` depuis « ${picked.title} »` : ""}`,
        poll: () => call(api.GET("/api/v1/records/prefill-runs/{run_id}/", { params: { path: { run_id: run.id } } })),
        outcome: (current) => {
          if (current.status === "succeeded") return { ok: true, message: summaryOf(reportOf(current)) }
          if (current.status === "failed") return { ok: false, message: current.error || "Le préremplissage a échoué." }
          return null
        },
        href: recordId ? `${route}/${recordId}` : undefined,
        // Nouvelle fiche : le lien de la notification mène à la fiche créée.
        hrefOf: (current) => (current.record_id ? `${route}/${current.record_id}` : undefined),
        onSettled: () => onDone?.(),
      })
    },
    onError: (error) => applyServerErrors(error, form.setError, defaults.map((def) => def.name)),
  })

  if (started) {
    return (
      <Notice tone="info" title="Préremplissage lancé" action={<Button size="sm" variant="ghost" onClick={onClose}>Fermer</Button>}>
        L'IA lit la pièce. Vous serez prévenu à la fin, même si vous changez d'écran ; la fiche préremplie apparaîtra en brouillon.
      </Notice>
    )
  }

  return (
    <FormProvider {...form}>
      <form
        noValidate
        aria-label={recordId ? "Compléter depuis une pièce" : "Préremplir depuis une pièce"}
        className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-line"
        onSubmit={form.handleSubmit((values) => {
          if (!picked) return
          start.mutate({
            document_version_id: picked.versionId,
            ...(recordId ? { record_id: recordId } : { defaults: payloadOf(defaults, values) }),
          })
        })}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <Sparkles className="size-4 text-blue-600" aria-hidden="true" />
              {recordId ? "Compléter depuis une pièce" : "Préremplir depuis une pièce"}
            </h2>
            <p className="mt-1 max-w-[68ch] text-xs text-ink-muted">{hint}</p>
          </div>
          <Button type="button" size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fermer le préremplissage">
            <X aria-hidden="true" />
          </Button>
        </div>
        <FormAlert />
        <DocumentPicker picked={picked} onPick={setPicked} />
        {defaults.length ? (
          <fieldset className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <legend className="mb-1 text-xs text-ink-muted">Ce que l'IA ne choisit pas :</legend>
            {defaults.map((def) => (
              <FieldControl key={def.name} def={{ ...def, createOnly: false }} register={form.register} control={form.control} />
            ))}
          </fieldset>
        ) : null}
        <p className="text-xs text-ink-muted">
          Les pages de la pièce sont envoyées au fournisseur d'IA configuré. {recordId ? "Seuls les champs vides seront remplis : rien de ce qui est saisi n'est écrasé." : ""}
        </p>
        <div className="flex justify-end">
          <Button type="submit" disabled={!picked || start.isPending}>
            <Sparkles data-icon="inline-start" aria-hidden="true" />
            Lancer le préremplissage
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

/** Dernier préremplissage d'une fiche : ce qui a été rempli, et ce qui a été écarté et pourquoi. */
export function LastPrefill({ recordType, recordId, fieldLabel }: { recordType: string; recordId: string; fieldLabel: (field: string) => string }) {
  const runs = useQuery({
    queryKey: ["records", recordType, recordId, "prefill-runs"],
    queryFn: () => call(api.GET("/api/v1/records/{record_type}/{id}/prefill-runs/", { params: { path: { record_type: recordType, id: recordId } } })),
  })
  const last = [...(runs.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  if (!last) return null
  const report = reportOf(last)
  return (
    <section aria-labelledby={`${recordId}-ia`} className="rounded-xl bg-card ring-1 ring-line">
      <h2 id={`${recordId}-ia`} className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-extrabold text-ink">
        <Sparkles className="size-4 text-blue-600" aria-hidden="true" />
        Préremplissage par l'IA
      </h2>
      <div className="space-y-2 px-4 py-3 text-[0.8125rem]">
        {last.status === "failed" ? (
          <p className="font-semibold text-block">{last.error || "Le préremplissage a échoué."}</p>
        ) : last.status === "succeeded" ? (
          <p className="text-ink">{summaryOf(report)}</p>
        ) : (
          <p className="text-ink-muted">En cours.</p>
        )}
        {report.filled?.length ? <p className="text-xs text-ink-muted">Remplis : {report.filled.map(fieldLabel).join(", ")}.</p> : null}
        {report.skipped?.length ? (
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-ink">{report.skipped.length} valeur(s) écartée(s)</summary>
            <ul className="mt-1 space-y-0.5 text-ink-muted">
              {report.skipped.map((item, index) => (
                <li key={`${item.field}-${index}`}>
                  {fieldLabel(item.field)}
                  {item.value ? ` (« ${item.value} »)` : ""} : {item.reason}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {runs.isError ? <p className="text-xs text-block">{userMessage(runs.error)}</p> : null}
      </div>
    </section>
  )
}

