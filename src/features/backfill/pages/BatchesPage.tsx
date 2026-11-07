import { FolderPlus, Loader2, X } from "lucide-react"
import { useState } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"

import { DataTable, Pagination, useListParams, type Column } from "@/components/data"
import { applyServerErrors, Field, FormAlert } from "@/components/forms"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { KIND_LABEL } from "@/features/documents"

import { useBatches, useCreateBatch, type Batch } from "../api"
import { BatchStatusBadge } from "../components/BatchStatusBadge"

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
const at = (value: string | null) => (value ? when.format(new Date(value)) : "")

const COLUMNS: Column<Batch>[] = [
  { key: "priority", header: "Ordre", numeric: true, align: "right", cell: (row) => row.priority },
  {
    key: "name",
    header: "Lot",
    wrap: true,
    cell: (row) => (
      <Link to={`/reprise/${row.id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
        {row.name}
      </Link>
    ),
  },
  { key: "status", header: "État", cell: (row) => <BatchStatusBadge status={row.status} /> },
  { key: "scanned", header: "Inventorié le", secondary: true, cell: (row) => <span className="text-ink-muted">{at(row.scanned_at)}</span> },
  { key: "submitted", header: "Déposé le", secondary: true, cell: (row) => <span className="text-ink-muted">{at(row.submitted_at)}</span> },
]

type Values = {
  name: string
  priority: string
  description: string
  prefixes: string
  excluded_prefixes: string
  kinds: string[]
  modified_since: string
  dossier_roots: string
}

const FIELDS = ["name", "priority", "description", "prefixes", "excluded_prefixes", "kinds", "modified_since", "dossier_roots"]
const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean)

/** Nouveau lot : un périmètre du dossier existant, repris dans l'ordre choisi par le Cabinet. */
function NewBatch({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const create = useCreateBatch()
  const form = useForm<Values>({
    defaultValues: { name: "", priority: "", description: "", prefixes: "", excluded_prefixes: "", kinds: [], modified_since: "", dossier_roots: "" },
  })
  return (
    <FormProvider {...form}>
      <form
        noValidate
        aria-label="Nouveau lot de reprise"
        className="mb-6 space-y-4 rounded-xl bg-card p-5 ring-1 ring-line"
        onSubmit={form.handleSubmit((values) =>
          create.mutate(
            {
              name: values.name.trim(),
              description: values.description.trim(),
              ...(values.priority ? { priority: Number(values.priority) } : {}),
              prefixes: lines(values.prefixes),
              excluded_prefixes: lines(values.excluded_prefixes),
              kinds: values.kinds,
              modified_since: values.modified_since || null,
              dossier_roots: lines(values.dossier_roots),
            } as never,
            {
              onSuccess: (batch) => navigate(`/reprise/${batch.id}`),
              onError: (error) => applyServerErrors(error, form.setError, FIELDS),
            },
          ),
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-ink">Nouveau lot de reprise</h2>
            <p className="mt-1 max-w-[68ch] text-xs text-ink-muted">
              Le lot désigne une partie du dossier existant. L'inventaire ne dépose rien : il compte les fichiers, pour vérifier le périmètre avant le dépôt.
            </p>
          </div>
          <Button type="button" size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fermer">
            <X aria-hidden="true" />
          </Button>
        </div>
        <FormAlert />
        <fieldset disabled={create.isPending} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <legend className="sr-only">Périmètre du lot</legend>
          <Field name="name" label="Nom du lot" required>
            <Input {...form.register("name")} />
          </Field>
          <Field name="priority" label="Ordre de reprise" help="1 est repris en premier.">
            <Input type="number" min={1} {...form.register("priority")} />
          </Field>
          <Field name="prefixes" label="Dossiers inclus" help="Un chemin par ligne, depuis la racine du dossier existant. Vide : tout le dossier.">
            <Textarea rows={3} {...form.register("prefixes")} />
          </Field>
          <Field name="excluded_prefixes" label="Dossiers exclus" help="Un chemin par ligne.">
            <Textarea rows={3} {...form.register("excluded_prefixes")} />
          </Field>
          <Field name="dossier_roots" label="Dossiers déposés" help="Un chemin par ligne : chaque sous-dossier y devient un dossier antérieur à vérifier.">
            <Textarea rows={2} {...form.register("dossier_roots")} />
          </Field>
          <Field name="modified_since" label="Modifiés depuis le">
            <Input type="date" {...form.register("modified_since")} />
          </Field>
          <Controller
            control={form.control}
            name="kinds"
            render={({ field }) => (
              <fieldset className="sm:col-span-2">
                <legend className="text-sm font-medium text-ink">Types de pièces</legend>
                <p className="text-xs text-ink-muted">Aucun coché : tous les types.</p>
                <div className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(KIND_LABEL).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-[0.8125rem]">
                      <Checkbox
                        checked={field.value.includes(value)}
                        onCheckedChange={(checked) => field.onChange(checked ? [...field.value, value] : field.value.filter((kind) => kind !== value))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          />
          <Field name="description" label="Description" className="sm:col-span-2">
            <Textarea rows={2} {...form.register("description")} />
          </Field>
        </fieldset>
        <div className="flex justify-end">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <FolderPlus data-icon="inline-start" aria-hidden="true" />}
            Créer le lot
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

/** Reprise de l'existant par lots (UC03) : chaque lot est inventorié, vérifié, puis déposé. */
export function BatchesPage() {
  const { params, update } = useListParams()
  const batches = useBatches(params.page)
  const [creating, setCreating] = useState(false)

  return (
    <Page>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[68ch]">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Reprise de la base</h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
            Le dossier existant du Cabinet est repris par lots, dans l'ordre choisi. Rien n'y est jamais modifié : les fichiers sont copiés dans la base, puis lus.
          </p>
        </div>
        {creating ? null : (
          <Button onClick={() => setCreating(true)}>
            <FolderPlus data-icon="inline-start" aria-hidden="true" />
            Nouveau lot
          </Button>
        )}
      </header>
      {creating ? <NewBatch onClose={() => setCreating(false)} /> : null}
      <DataTable
        caption="Lots de reprise"
        columns={COLUMNS}
        rows={batches.data?.results}
        rowKey={(row) => row.id}
        loading={batches.isFetching}
        error={batches.error}
        onRetry={() => void batches.refetch()}
        empty={{ title: "Aucun lot de reprise", hint: "Créez le premier lot : les pièces administratives, d'habitude." }}
      />
      {batches.data ? <Pagination page={params.page} count={batches.data.count} onPage={(page) => update({ page })} /> : null}
    </Page>
  )
}
