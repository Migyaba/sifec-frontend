import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, Save, Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router"

import { api, ApiError, call, userMessage } from "@/api"
import { hasRole, SUPERVISORS } from "@/app/roles"
import { DataTable, Pagination, SearchBox, useListParams, type Column } from "@/components/data"
import { applyServerErrors, FormAlert } from "@/components/forms"
import { Notice } from "@/components/sifec/notice"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/features/auth"

import { invalidateRecord, type RecordBase } from "./api"
import { ItemList, type ItemSection } from "./components/ItemList"
import { LastPrefill, PrefillPanel } from "./components/Prefill"
import { ProofPanel } from "./components/ProofPanel"
import { RecordStatusBadge, ReviewBar } from "./components/ReviewBar"
import { VersionsList } from "./components/VersionsList"
import { defaultsOf, displayValue, FieldControl, payloadOf, type FieldDef, type FormValues } from "./fields"
import { RECORD_STATUS_LABEL, type RecordStatus } from "./labels"

export type RecordRow = RecordBase & Record<string, unknown>

/**
 * Description d'un type de fiche : tout ce que les pages communes ont besoin de savoir. Le cycle,
 * les preuves, les listes et les versions sont les mêmes pour tous les types.
 */
export type RecordConfig = {
  /** Type du cycle commun (`records/{type}/…`). */
  type: string
  /** Chemin de l'API du type (`/api/v1/missions`). */
  base: string
  /** Route de l'interface (`/references`). */
  route: string
  title: string
  intro: string
  newLabel: string
  newTitle: string
  searchPlaceholder: string
  empty: { title: string; hint: string }
  fields: FieldDef[]
  sections?: ItemSection[]
  columns: Column<RecordRow>[]
  /** Filtres de la liste ; `optionsFrom` prend ses choix dans `useOptions` (types de pièces…). */
  filters?: { key: string; label: string; options?: Record<string, string>; optionsFrom?: string }[]
  name: (row: RecordRow) => string
  /** Options chargées au moment (types de pièces…), par nom de champ. */
  useOptions?: () => Record<string, Record<string, string>>
  /** Préremplissage par l'IA, pour les types qui le permettent : champs indiqués au lancement. */
  prefill?: { defaults: string[]; hint: string }
  /** Compléments propres au type : au-dessus de la fiche, et dans la colonne de droite. */
  top?: (row: RecordRow) => React.ReactNode
  aside?: (row: RecordRow, editable: boolean) => React.ReactNode
}

type Untyped = Record<"GET" | "POST" | "PATCH", (path: string, init: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>>
const loose = api as unknown as Untyped

/** Champs du type, avec leurs choix chargés. Stables d'un rendu à l'autre : le formulaire en dépend. */
function useFields(config: RecordConfig): FieldDef[] {
  const options = config.useOptions?.() ?? {}
  const key = JSON.stringify(options)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => config.fields.map((def) => (options[def.name] ? { ...def, options: options[def.name] } : def)), [config, key])
}

/** Liste paginée d'un type de fiche, avec recherche et filtres dans l'adresse. */
export function RecordListPage({ config }: { config: RecordConfig }) {
  const keys = (config.filters ?? []).map((filter) => filter.key)
  const { params, query, update } = useListParams(["status", ...keys])
  const list = useQuery({
    queryKey: ["records", config.type, "list", query],
    queryFn: () => call(loose.GET(`${config.base}/`, { params: { query } })) as Promise<{ count: number; results: RecordRow[] }>,
    placeholderData: keepPreviousData,
  })
  const loaded = config.useOptions?.() ?? {}
  const filters = [
    { key: "status", label: "Fiche", options: RECORD_STATUS_LABEL as Record<string, string> },
    ...(config.filters ?? []).map((filter) => ({ ...filter, options: filter.options ?? loaded[filter.optionsFrom ?? ""] ?? {} })),
  ]
  const filtered = Boolean(params.q || Object.keys(params.filters).length)
  const [prefilling, setPrefilling] = useState(false)
  const client = useQueryClient()
  const fields = useFields(config)
  const newLink = (
    <Button asChild>
      <Link to={`${config.route}/nouveau`}>
        <Plus data-icon="inline-start" aria-hidden="true" />
        {config.newLabel}
      </Link>
    </Button>
  )

  return (
    <Page>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[68ch]">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">{config.title}</h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-muted">{config.intro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.prefill && !prefilling ? (
            <Button variant="outline" onClick={() => setPrefilling(true)}>
              <Sparkles data-icon="inline-start" aria-hidden="true" />
              Préremplir depuis une pièce
            </Button>
          ) : null}
          {newLink}
        </div>
      </header>
      {config.prefill && prefilling ? (
        <div className="mb-6">
          <PrefillPanel
            recordType={config.type}
            route={config.route}
            hint={config.prefill.hint}
            defaults={fields.filter((def) => config.prefill?.defaults.includes(def.name))}
            onClose={() => setPrefilling(false)}
            onDone={() => void client.invalidateQueries({ queryKey: ["records", config.type, "list"] })}
          />
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={params.q} onSearch={(q) => update({ q })} label={`Rechercher : ${config.title.toLowerCase()}`} placeholder={config.searchPlaceholder} />
        {filters.map((filter) => (
          <Select key={filter.key} value={params.filters[filter.key] ?? "tous"} onValueChange={(next) => update({ filters: { [filter.key]: next === "tous" ? null : next } })}>
            <SelectTrigger className="w-[min(15rem,100%)]" aria-label={filter.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">{filter.label} : tous</SelectItem>
              {Object.entries(filter.options).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
      <DataTable
        caption={config.title}
        columns={config.columns}
        rows={list.data?.results}
        rowKey={(row) => row.id}
        loading={list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        empty={
          filtered
            ? { title: "Aucune fiche ne correspond", hint: "Vérifiez l'orthographe, ou retirez un filtre." }
            : { ...config.empty, action: newLink }
        }
      />
      {list.data ? <Pagination page={params.page} count={list.data.count} onPage={(page) => update({ page })} /> : null}
    </Page>
  )
}

function RecordForm({ config, fields, row }: { config: RecordConfig; fields: FieldDef[]; row?: RecordRow }) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const form = useForm<FormValues>({ defaultValues: defaultsOf(fields, row) })
  const { reset, handleSubmit, setError, formState } = form
  const archived = row?.status === "archived"
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      (row
        ? call(loose.PATCH(`${config.base}/{id}/`, { params: { path: { id: row.id } }, body }))
        : call(loose.POST(`${config.base}/`, { body }))) as Promise<RecordRow>,
    onSuccess: (saved) => {
      client.setQueryData(["records", config.type, "one", saved.id], saved)
      void client.invalidateQueries({ queryKey: ["records", config.type, "list"] })
      void invalidateRecord(client, saved.id)
      if (!row) navigate(`${config.route}/${saved.id}`, { replace: true })
    },
    onError: (error) => applyServerErrors(error, setError, fields.map((def) => def.name)),
  })
  // Remis à zéro seulement quand la fiche change sur le serveur, jamais pendant une saisie.
  const version = row ? `${row.id}:${row.updated_at}` : "nouvelle"
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => reset(defaultsOf(fields, row)), [version, reset])

  return (
    <FormProvider {...form}>
      <form noValidate className="space-y-5 rounded-xl bg-card p-5 ring-1 ring-line" onSubmit={handleSubmit((values) => save.mutate(payloadOf(fields, values, row ? formState.dirtyFields : undefined)))}>
        <FormAlert />
        {row?.status === "published" ? (
          <Notice tone="info" title="Fiche publiée">
            Modifier une valeur ramène la fiche au brouillon. La version publiée reste utilisée dans les dossiers jusqu'à la prochaine validation.
          </Notice>
        ) : null}
        <fieldset disabled={archived || save.isPending} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <legend className="sr-only">{config.newTitle}</legend>
          {fields.map((def) => (
            <FieldControl key={def.name} def={def} register={form.register} control={form.control} editing={Boolean(row)} />
          ))}
        </fieldset>
        {archived ? null : (
          <div className="flex items-center justify-end gap-3">
            {row && formState.isDirty ? <span className="text-xs text-ink-muted">Modifications non enregistrées</span> : null}
            <Button type="submit" disabled={save.isPending || (Boolean(row) && !formState.isDirty)}>
              {save.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <Save data-icon="inline-start" aria-hidden="true" />}
              {row ? "Enregistrer" : "Créer la fiche"}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}

/** Fiche d'un type : formulaire, listes, vérification, preuves et versions. */
export function RecordDetailPage({ config }: { config: RecordConfig }) {
  const { id } = useParams()
  const creating = id === "nouveau"
  const fields = useFields(config)
  const session = useSession()
  const user = session.data?.user
  const record = useQuery({
    queryKey: ["records", config.type, "one", id ?? ""],
    queryFn: () => call(loose.GET(`${config.base}/{id}/`, { params: { path: { id } } })) as Promise<RecordRow>,
    enabled: Boolean(id) && !creating,
  })

  const header = (title: string) => (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-xs font-semibold text-ink-muted">
        <Link to={config.route} className="hover:text-ink hover:underline">
          {config.title}
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{title}</span>
      </nav>
      <h1 className="mb-5 text-2xl leading-tight font-extrabold break-words text-ink">{title}</h1>
    </>
  )

  if (creating) {
    return (
      <Page>
        {header(config.newTitle)}
        <div className="max-w-[56rem]">
          <RecordForm config={config} fields={fields} />
        </div>
      </Page>
    )
  }
  if (record.isPending) {
    return (
      <Page>
        <Skeleton className="h-8 w-[40%]" />
        <Skeleton className="mt-6 h-64 w-full" />
      </Page>
    )
  }
  if (record.isError) {
    return (
      <Page>
        <Notice tone={record.error instanceof ApiError && record.error.status === 404 ? "info" : "block"} title="Fiche indisponible">
          {userMessage(record.error)}
        </Notice>
      </Page>
    )
  }

  const row = record.data
  const editable = row.status !== "archived"
  const byName = Object.fromEntries(fields.map((def) => [def.name, def]))
  const fieldLabel = (field: string) => {
    const [collection, , name] = field.split(".")
    const section = config.sections?.find((item) => item.collection === collection)
    const def = section?.fields.find((item) => item.name === name)
    if (section && def) return `${section.title}, ${def.label.toLowerCase()}`
    return byName[field]?.label ?? config.sections?.find((item) => item.collection === field)?.title ?? field
  }

  return (
    <Page>
      {header(config.name(row))}
      <div className="mb-5 space-y-3">
        <ReviewBar recordType={config.type} record={row} userId={user?.id ?? ""} fieldLabel={fieldLabel} canArchive={hasRole(user, SUPERVISORS)} />
        {config.top?.(row)}
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <RecordForm config={config} fields={fields} row={row} />
          {(config.sections ?? []).map((section) => (
            <ItemList key={section.collection} base={config.base} recordType={config.type} recordId={row.id} section={section} editable={editable} />
          ))}
        </div>
        <div className="space-y-5">
          <ProofPanel
            recordType={config.type}
            recordId={row.id}
            title="Preuves de la fiche"
            only={(key) => !key.includes(".")}
            describe={(key) => (byName[key] ? { label: byName[key].label, value: displayValue(byName[key], row[key]) } : null)}
            editable={editable}
          />
          {config.prefill && editable ? <CompleteFromDocument config={config} recordId={row.id} /> : null}
          {config.prefill ? <LastPrefill recordType={config.type} recordId={row.id} fieldLabel={fieldLabel} /> : null}
          {config.aside?.(row, editable)}
          <VersionsList recordType={config.type} recordId={row.id} />
        </div>
      </div>
    </Page>
  )
}

function CompleteFromDocument({ config, recordId }: { config: RecordConfig; recordId: string }) {
  const [open, setOpen] = useState(false)
  const client = useQueryClient()
  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Sparkles data-icon="inline-start" aria-hidden="true" />
        Compléter depuis une pièce
      </Button>
    )
  }
  return (
    <PrefillPanel
      recordType={config.type}
      route={config.route}
      recordId={recordId}
      hint={config.prefill?.hint ?? ""}
      onClose={() => setOpen(false)}
      onDone={() => void invalidateRecord(client, recordId)}
    />
  )
}

/** Statut de fiche et date, pour les colonnes communes des listes. */
export const statusColumn: Column<RecordRow> = {
  key: "status",
  header: "Fiche",
  cell: (row) => <RecordStatusBadge status={row.status as RecordStatus} />,
}
