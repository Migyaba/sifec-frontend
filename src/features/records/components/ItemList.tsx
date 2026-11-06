import { ChevronDown, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { FormProvider, useForm } from "react-hook-form"

import { userMessage } from "@/api"
import { useConfirm } from "@/components/confirm"
import { applyServerErrors, FormAlert } from "@/components/forms"
import { ConfidenceTag, type Level } from "@/components/sifec/confidence"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useConfidence } from "../api"
import { defaultsOf, displayValue, FieldControl, payloadOf, type FieldDef, type FormValues } from "../fields"
import { useItemMutations, useItems, type ItemRow } from "../items"
import { levelOf } from "../labels"
import { ProofPanel } from "./ProofPanel"

export type ItemSection = {
  collection: string
  title: string
  /** « Ajouter une expérience » */
  addLabel: string
  fields: FieldDef[]
  summary: (row: ItemRow) => { title: string; detail?: string }
  empty: string
}

const RANK: Record<Level, number> = { block: 3, check: 2, ok: 1 }

function ItemForm({
  section,
  row,
  onSave,
  onCancel,
  pending,
}: {
  section: ItemSection
  row?: ItemRow
  onSave: (body: Record<string, unknown>, form: ReturnType<typeof useForm<FormValues>>) => void
  onCancel: () => void
  pending: boolean
}) {
  const form = useForm<FormValues>({ defaultValues: defaultsOf(section.fields, row) })
  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="space-y-4 rounded-lg bg-ground p-4 ring-1 ring-line"
        onSubmit={form.handleSubmit((values) =>
          onSave(payloadOf(section.fields, values, row ? form.formState.dirtyFields : undefined), form),
        )}
      >
        <FormAlert />
        <fieldset disabled={pending} className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <legend className="sr-only">{row ? "Modifier l'élément" : section.addLabel}</legend>
          {section.fields.map((def) => (
            <FieldControl
              key={def.name}
              def={def}
              register={form.register}
              control={form.control}
              editing={Boolean(row)}
              documentTitle={typeof row?.document_title === "string" ? row.document_title : undefined}
            />
          ))}
        </fieldset>
        <p className="text-xs text-ink-muted">Enregistrer ramène la fiche au brouillon : une autre personne devra la vérifier.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={pending || (Boolean(row) && !form.formState.isDirty)}>
            {pending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
            Enregistrer
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

/**
 * Liste d'une fiche (expériences, diplômes…) : ajout, modification, retrait, et pour chaque
 * élément son niveau de confiance et ses preuves. Les champs à prouver viennent du serveur.
 */
export function ItemList({
  base,
  recordType,
  recordId,
  section,
  editable,
}: {
  base: string
  recordType: string
  recordId: string
  section: ItemSection
  editable: boolean
}) {
  const items = useItems<ItemRow>(base, recordId, section.collection)
  const mutations = useItemMutations(base, recordId, section.collection)
  const confidence = useConfidence(recordType, recordId)
  const confirm = useConfirm()
  const [editing, setEditing] = useState<string | "new" | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const names = section.fields.map((def) => def.name)
  const labels = Object.fromEntries(section.fields.map((def) => [def.name, def]))

  const levelOfItem = (id: string): Level | null => {
    const prefix = `${section.collection}.${id}.`
    let worst: Level | null = null
    for (const item of confidence.data?.by_field ?? []) {
      if (!item.field.startsWith(prefix)) continue
      const level = levelOf(item.level)
      if (level && (!worst || RANK[level] > RANK[worst])) worst = level
    }
    return worst
  }

  const save = (row: ItemRow | undefined) => (body: Record<string, unknown>, form: ReturnType<typeof useForm<FormValues>>) => {
    const options = {
      onSuccess: () => setEditing(null),
      onError: (error: unknown) => applyServerErrors(error, form.setError, names),
    }
    if (row) mutations.update.mutate({ id: row.id, body }, options)
    else mutations.create.mutate(body, options)
  }

  const rows = [...(items.data ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return (
    <section aria-labelledby={`${section.collection}-title`} className="rounded-xl bg-card ring-1 ring-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id={`${section.collection}-title`} className="text-sm font-extrabold text-ink">
          {section.title}
          {items.data ? <span className="tabular ml-1.5 font-semibold text-ink-muted">{items.data.length}</span> : null}
        </h2>
        {editable && editing !== "new" ? (
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            {section.addLabel}
          </Button>
        ) : null}
      </div>
      {editing === "new" ? (
        <div className="border-b border-line p-4">
          <ItemForm section={section} onSave={save(undefined)} onCancel={() => setEditing(null)} pending={mutations.create.isPending} />
        </div>
      ) : null}
      {items.isError ? (
        <p role="alert" className="px-4 py-3 text-xs font-semibold text-block">
          {userMessage(items.error)}
        </p>
      ) : null}
      {items.isSuccess && !rows.length && editing !== "new" ? <p className="px-4 py-3 text-[0.8125rem] text-ink-muted">{section.empty}</p> : null}
      {mutations.remove.isError ? (
        <p role="alert" className="px-4 py-2 text-xs font-semibold text-block">
          {userMessage(mutations.remove.error)}
        </p>
      ) : null}
      <ul className="divide-y divide-line">
        {rows.map((row) => {
          const { title, detail } = section.summary(row)
          const level = levelOfItem(row.id)
          const expanded = open === row.id
          return (
            <li key={row.id} className="px-4 py-3">
              {editing === row.id ? (
                <ItemForm section={section} row={row} onSave={save(row)} onCancel={() => setEditing(null)} pending={mutations.update.isPending} />
              ) : (
                <>
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.8125rem] font-semibold text-ink">{title}</div>
                      {detail ? <div className="text-xs text-ink-muted">{detail}</div> : null}
                    </div>
                    {level ? <ConfidenceTag level={level} /> : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpen(expanded ? null : row.id)}
                      aria-expanded={expanded}
                      aria-controls={`${row.id}-preuves`}
                    >
                      Preuves
                      <ChevronDown data-icon="inline-end" className={cn("transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                    </Button>
                    {editable ? (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(row.id)} aria-label={`Modifier ${title}`}>
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Retirer ${title}`}
                          onClick={async () => {
                            const answer = await confirm({
                              title: `Retirer « ${title} » ?`,
                              description: "L'élément et ses preuves sont retirés de la fiche, qui repasse en brouillon.",
                              confirmLabel: "Retirer",
                              tone: "danger",
                            })
                            if (answer) mutations.remove.mutate(row.id)
                          }}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                  {expanded ? (
                    <div id={`${row.id}-preuves`} className="mt-2 rounded-lg ring-1 ring-line">
                      <ProofPanel
                        bare
                        title={`Preuves de ${title}`}
                        recordType={recordType}
                        recordId={recordId}
                        editable={editable}
                        only={(key) => key.startsWith(`${section.collection}.${row.id}.`)}
                        describe={(key) => {
                          const name = key.split(".").at(-1) ?? ""
                          const def = labels[name]
                          return def ? { label: def.label, value: displayValue(def, row[name]) } : null
                        }}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
