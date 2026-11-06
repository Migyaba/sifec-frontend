import { Loader2, Save } from "lucide-react"
import { useEffect } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router"

import { ApiError, userMessage } from "@/api"
import { SUPERVISORS, hasRole } from "@/app/roles"
import { applyServerErrors, Field, FormAlert } from "@/components/forms"
import { Notice } from "@/components/sifec/notice"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "@/features/auth"
import { ProofPanel, ReviewBar, VersionsList, type DescribeField } from "@/features/records"

import { EMPLOYMENT_LABEL, FIELD_LABEL, useEntities, useExpert, useSaveExpert, type Employment, type Expert, type ExpertInput } from "../api"

type Values = {
  entity: string
  employment: Employment | ""
  last_name: string
  first_name: string
  title: string
  birth_date: string
  nationality: string
  email: string
  phone: string
  cv_date: string
  summary: string
}

const FIELDS = Object.keys(FIELD_LABEL)
const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })
const formatDay = (value?: string | null) => (value ? date.format(new Date(`${value}T12:00:00`)) : "")

function valuesOf(expert?: Expert): Values {
  return {
    entity: expert?.entity ?? "",
    employment: expert?.employment ?? "",
    last_name: expert?.last_name ?? "",
    first_name: expert?.first_name ?? "",
    title: expert?.title ?? "",
    birth_date: expert?.birth_date ?? "",
    nationality: expert?.nationality ?? "",
    email: (expert?.email as string | undefined) ?? "",
    phone: expert?.phone ?? "",
    cv_date: expert?.cv_date ?? "",
    summary: expert?.summary ?? "",
  }
}

/** Ce qui part au serveur : les dates vides deviennent nulles ; en modification, les seuls champs changés. */
function payload(values: Values, dirty: Partial<Record<keyof Values, unknown>> | null): Partial<ExpertInput> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(values) as [keyof Values, string][]) {
    if (dirty && !dirty[key]) continue
    out[key] = (key === "birth_date" || key === "cv_date") && value === "" ? null : value
  }
  return out as Partial<ExpertInput>
}

function ExpertForm({ expert }: { expert?: Expert }) {
  const navigate = useNavigate()
  const entities = useEntities()
  const save = useSaveExpert(expert?.id)
  const form = useForm<Values>({ defaultValues: valuesOf(expert) })
  const { register, control, handleSubmit, reset, setError, formState } = form
  const archived = expert?.status === "archived"

  // Après un enregistrement, le formulaire repart des valeurs du serveur.
  useEffect(() => reset(valuesOf(expert)), [expert, reset])
  useEffect(() => {
    if (!expert && entities.data?.results.length === 1) form.setValue("entity", entities.data.results[0].id)
  }, [entities.data, expert, form])

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="space-y-5 rounded-xl bg-card p-5 ring-1 ring-line"
        onSubmit={handleSubmit((values) =>
          save.mutate(payload(values, expert ? formState.dirtyFields : null), {
            onSuccess: (saved) => {
              if (!expert) navigate(`/experts/${saved.id}`, { replace: true })
            },
            onError: (error) => applyServerErrors(error, setError, FIELDS),
          }),
        )}
      >
        <FormAlert />
        {expert?.status === "published" ? (
          <Notice tone="info" title="Fiche publiée">
            Modifier une valeur ramène la fiche au brouillon. La version publiée reste utilisée dans les dossiers jusqu'à la prochaine validation.
          </Notice>
        ) : null}
        <fieldset disabled={archived || save.isPending} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <legend className="sr-only">Identité de l'expert</legend>
          <Field name="last_name" label={FIELD_LABEL.last_name} required>
            <Input autoComplete="off" {...register("last_name")} />
          </Field>
          <Field name="first_name" label={FIELD_LABEL.first_name} required>
            <Input autoComplete="off" {...register("first_name")} />
          </Field>
          <Field name="entity" label={FIELD_LABEL.entity} required>
            {(a11y) => (
            <Controller
              control={control}
              name="entity"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={Boolean(expert)}>
                  <SelectTrigger className="w-full" {...a11y}>
                    <SelectValue placeholder={entities.isPending ? "Chargement…" : "Choisir l'organisation"} />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.data?.results.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            )}
          </Field>
          <Field name="employment" label={FIELD_LABEL.employment} required>
            {(a11y) => (
            <Controller
              control={control}
              name="employment"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" {...a11y}>
                    <SelectValue placeholder="Choisir le statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EMPLOYMENT_LABEL) as Employment[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {EMPLOYMENT_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            )}
          </Field>
          <Field name="title" label={FIELD_LABEL.title} className="sm:col-span-2">
            <Input {...register("title")} />
          </Field>
          <Field name="birth_date" label={FIELD_LABEL.birth_date} help="Pièce source exigée.">
            <Input type="date" {...register("birth_date")} />
          </Field>
          <Field name="nationality" label={FIELD_LABEL.nationality} help="Pièce source exigée.">
            <Input {...register("nationality")} />
          </Field>
          <Field name="email" label={FIELD_LABEL.email}>
            <Input type="email" autoComplete="off" {...register("email")} />
          </Field>
          <Field name="phone" label={FIELD_LABEL.phone}>
            <Input type="tel" autoComplete="off" {...register("phone")} />
          </Field>
          <Field name="cv_date" label={FIELD_LABEL.cv_date} help="Pièce source exigée. Au-delà de 12 mois, le CV est à faire confirmer.">
            <Input type="date" {...register("cv_date")} />
          </Field>
          <Field name="summary" label={FIELD_LABEL.summary} className="sm:col-span-2">
            <Textarea rows={5} {...register("summary")} />
          </Field>
        </fieldset>
        {archived ? null : (
          <div className="flex items-center justify-end gap-3">
            {expert && formState.isDirty ? <span className="text-xs text-ink-muted">Modifications non enregistrées</span> : null}
            <Button type="submit" disabled={save.isPending || (Boolean(expert) && !formState.isDirty)}>
              {save.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <Save data-icon="inline-start" aria-hidden="true" />}
              {expert ? "Enregistrer" : "Créer la fiche"}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}

export function ExpertPage() {
  const { id } = useParams()
  const creating = id === "nouveau"
  const expert = useExpert(creating ? undefined : id)
  const session = useSession()
  const user = session.data?.user

  const header = (title: string) => (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-xs font-semibold text-ink-muted">
        <Link to="/experts" className="hover:text-ink hover:underline">
          Experts
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{title}</span>
      </nav>
      <h1 className="mb-5 text-2xl leading-tight font-extrabold text-ink">{title}</h1>
    </>
  )

  if (creating) {
    return (
      <Page>
        {header("Nouvel expert")}
        <div className="max-w-[56rem]">
          <ExpertForm />
        </div>
      </Page>
    )
  }
  if (expert.isPending) {
    return (
      <Page>
        <Skeleton className="h-8 w-[40%]" />
        <Skeleton className="mt-6 h-64 w-full" />
      </Page>
    )
  }
  if (expert.isError) {
    return (
      <Page>
        <Notice tone={expert.error instanceof ApiError && expert.error.status === 404 ? "info" : "block"} title="Fiche indisponible">
          {userMessage(expert.error)}
        </Notice>
      </Page>
    )
  }

  const data = expert.data
  const describe: DescribeField = (key) => {
    if (key === "birth_date") return { label: FIELD_LABEL.birth_date, value: formatDay(data.birth_date) }
    if (key === "cv_date") return { label: FIELD_LABEL.cv_date, value: formatDay(data.cv_date) }
    if (key in FIELD_LABEL && !key.includes(".")) return { label: FIELD_LABEL[key], value: String(data[key as keyof Expert] ?? "") }
    return null
  }

  return (
    <Page>
      {header(`${data.last_name} ${data.first_name}`.trim())}
      <div className="mb-5">
        <ReviewBar
          recordType="expert"
          record={data}
          userId={user?.id ?? ""}
          fieldLabel={(field) => FIELD_LABEL[field] ?? field}
          canArchive={hasRole(user, SUPERVISORS)}
        />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ExpertForm expert={data} />
        <div className="space-y-5">
          <ProofPanel recordType="expert" recordId={data.id} describe={describe} editable={data.status !== "archived"} />
          <VersionsList recordType="expert" recordId={data.id} />
        </div>
      </div>
    </Page>
  )
}
