import { Loader2, Plus, Undo2, X } from "lucide-react"
import { useState } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"

import { userMessage } from "@/api"
import { hasRole } from "@/app/roles"
import { useConfirm } from "@/components/confirm"
import { DataTable, type Column } from "@/components/data"
import { applyServerErrors, Field, FormAlert } from "@/components/forms"
import { Notice } from "@/components/sifec/notice"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "@/features/auth"
import { cn } from "@/lib/utils"

import { DELEGATION_STATE_LABEL, delegationState, SCOPE_GROUPS, scopeLabel, useAllUsers, useCreateDelegation, useDelegations, useRevokeDelegation, type Delegation, type DelegationState } from "../api"

const when = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
const STATE_CLASS: Record<DelegationState, string> = {
  active: "bg-blue-50 text-blue-800",
  upcoming: "bg-muted text-ink",
  expired: "text-ink-muted",
  revoked: "text-ink-muted line-through decoration-ink-muted/60",
}

/** Valeur d'un champ date et heure (heure locale), sans les secondes. */
function localInput(date: Date): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return shifted.toISOString().slice(0, 16)
}

type Values = {
  delegate_id: string
  scope: string[]
  valid_from: string
  valid_until: string
  written_reference: string
  reason: string
}
const FIELDS = ["delegate_id", "scope", "valid_from", "valid_until", "written_reference", "reason"]

function initialValues(): Values {
  const start = new Date()
  start.setSeconds(0, 0)
  const end = new Date(start.getTime() + 14 * 86_400_000)
  return {
    delegate_id: "",
    scope: [],
    valid_from: localInput(start),
    valid_until: localInput(end),
    written_reference: "",
    reason: "",
  }
}

function NewDelegation({ me, onClose }: { me: string; onClose: () => void }) {
  const create = useCreateDelegation()
  const users = useAllUsers()
  const [defaults] = useState(initialValues)
  const form = useForm<Values>({ defaultValues: defaults })
  const candidates = (users.data ?? []).filter((user) => user.is_active && user.id !== me && user.role !== "admin_technique")
  return (
    <FormProvider {...form}>
      <form
        noValidate
        aria-label="Nouvelle délégation"
        className="mb-6 space-y-4 rounded-xl bg-card p-5 ring-1 ring-line"
        onSubmit={form.handleSubmit((values) => {
          if (!values.delegate_id)
            return form.setError("delegate_id", {
              message: "Choisissez la personne.",
            })
          if (!values.scope.length)
            return form.setError("scope", {
              message: "Cochez au moins une validation.",
            })
          create.mutate(
            {
              delegate_id: values.delegate_id,
              scope: values.scope,
              valid_from: new Date(values.valid_from).toISOString(),
              valid_until: new Date(values.valid_until).toISOString(),
              written_reference: values.written_reference.trim(),
              reason: values.reason.trim(),
            },
            {
              onSuccess: onClose,
              onError: (error) => applyServerErrors(error, form.setError, FIELDS),
            },
          )
        })}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-ink">Nouvelle délégation</h2>
            <p className="mt-1 max-w-[68ch] text-xs text-ink-muted">
              La personne valide en votre nom, pendant la période, les seules validations cochées. Chacune de ses validations porte votre nom et le sien.
            </p>
          </div>
          <Button type="button" size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fermer">
            <X aria-hidden="true" />
          </Button>
        </div>
        <FormAlert />
        <fieldset disabled={create.isPending} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <legend className="sr-only">Délégation</legend>
          <Controller
            control={form.control}
            name="delegate_id"
            render={({ field }) => (
              <Field name="delegate_id" label="Personne déléguée" required className="sm:col-span-2">
                {(a11y) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...a11y} className="w-full sm:w-[50%]">
                      <SelectValue placeholder={users.isPending ? "Chargement des comptes" : "Choisir une personne"} />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="scope"
            render={({ field, fieldState }) => (
              <fieldset className="sm:col-span-2" aria-describedby={fieldState.error ? "scope-error" : undefined}>
                <legend className="text-sm font-medium text-ink">
                  Validations confiées <span className="text-block">*</span>
                </legend>
                <div className="mt-2 grid gap-x-6 gap-y-4 md:grid-cols-3">
                  {SCOPE_GROUPS.map((group) => (
                    <div key={group.title}>
                      <p className="text-xs font-bold text-ink-muted">{group.title}</p>
                      <div className="mt-1.5 space-y-1.5">
                        {group.items.map((item) => (
                          <label key={item.key} className="flex items-center gap-2 text-[0.8125rem]">
                            <Checkbox
                              checked={field.value.includes(item.key)}
                              onCheckedChange={(checked) => field.onChange(checked ? [...field.value, item.key] : field.value.filter((key) => key !== item.key))}
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {fieldState.error ? (
                  <p id="scope-error" role="alert" className="mt-1.5 text-xs font-semibold text-block">
                    {fieldState.error.message}
                  </p>
                ) : null}
              </fieldset>
            )}
          />
          <Field name="valid_from" label="Du" required>
            <Input
              type="datetime-local"
              {...form.register("valid_from", {
                required: "Indiquez le début.",
              })}
            />
          </Field>
          <Field name="valid_until" label="Au" required>
            <Input
              type="datetime-local"
              {...form.register("valid_until", {
                required: "Indiquez la fin.",
              })}
            />
          </Field>
          <Field name="written_reference" label="Délégation écrite" required help="Note de service, courrier ou courriel qui la donne.">
            <Input
              placeholder="Note de service n° 12/2026"
              {...form.register("written_reference", {
                required: "La délégation doit être écrite : indiquez sa référence.",
              })}
            />
          </Field>
          <Field name="reason" label="Motif" required>
            <Textarea rows={2} placeholder="Congés du chef de département" {...form.register("reason", { required: "Indiquez le motif." })} />
          </Field>
        </fieldset>
        <div className="flex justify-end">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <Plus data-icon="inline-start" aria-hidden="true" />}
            Déléguer
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

/**
 * Délégations écrites (UC16, synthèse M11) : le chef de département confie certaines
 * validations, pour une période, en citant l'écrit qui les donne. Chacun voit celles qu'il a
 * données ou reçues ; le chef de département et l'administrateur les voient toutes.
 */
export function DelegationsPage() {
  const session = useSession().data
  const me = session?.user.id ?? ""
  const canDelegate = hasRole(session?.user, ["chef_departement"])
  const delegations = useDelegations()
  const revoke = useRevokeDelegation()
  const confirm = useConfirm()
  const [creating, setCreating] = useState(false)
  // Instant de lecture de la liste : l'état d'une délégation (en vigueur, échue) s'y rapporte.
  const now = delegations.dataUpdatedAt

  const columns: Column<Delegation>[] = [
    {
      key: "who",
      header: "Délégation",
      wrap: true,
      cell: (row) => (
        <div className="min-w-[12rem]">
          <div className="font-semibold text-ink">{row.delegate.full_name}</div>
          <div className="text-xs text-ink-muted">au nom de {row.delegator.full_name}</div>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Validations",
      wrap: true,
      cell: (row) => (
        <ul className="min-w-[16rem] space-y-0.5 text-xs text-ink">
          {row.scope.map((key) => (
            <li key={key}>{scopeLabel(key)}</li>
          ))}
        </ul>
      ),
    },
    {
      key: "period",
      header: "Période",
      cell: (row) => (
        <div className="text-xs">
          <div>du {when.format(new Date(row.valid_from))}</div>
          <div>au {when.format(new Date(row.valid_until))}</div>
        </div>
      ),
    },
    {
      key: "reference",
      header: "Écrit et motif",
      wrap: true,
      secondary: true,
      cell: (row) => (
        <div className="min-w-[12rem] text-xs">
          <div className="font-semibold text-ink">{row.written_reference}</div>
          <div className="text-ink-muted">{row.reason}</div>
        </div>
      ),
    },
    {
      key: "state",
      header: "État",
      cell: (row) => {
        const state = delegationState(row, now)
        return <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", STATE_CLASS[state])}>{DELEGATION_STATE_LABEL[state]}</span>
      },
    },
    {
      key: "action",
      header: "",
      align: "right",
      cell: (row) => {
        const state = delegationState(row, now)
        if (row.delegator.id !== me || state === "revoked" || state === "expired") return null
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={revoke.isPending}
            onClick={async () => {
              const ok = await confirm({
                title: `Révoquer la délégation de ${row.delegate.full_name} ?`,
                description: "Elle cesse tout de suite. Les validations déjà faites en votre nom restent valables.",
                confirmLabel: "Révoquer",
                tone: "danger",
              })
              if (ok) revoke.mutate(row.id)
            }}
          >
            <Undo2 data-icon="inline-start" aria-hidden="true" />
            Révoquer
          </Button>
        )
      },
    },
  ]

  return (
    <Page>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[68ch]">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Délégations</h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
            Une validation se délègue par écrit, pour une période et des validations précises. Chaque validation faite par délégation porte les deux noms.
          </p>
        </div>
        {canDelegate && !creating ? (
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Nouvelle délégation
          </Button>
        ) : null}
      </header>
      {revoke.isError ? (
        <Notice tone="block" title="Révocation refusée" className="mb-4">
          {userMessage(revoke.error)}
        </Notice>
      ) : null}
      {creating ? <NewDelegation me={me} onClose={() => setCreating(false)} /> : null}
      <DataTable
        caption="Délégations"
        columns={columns}
        rows={delegations.data}
        rowKey={(row) => row.id}
        loading={delegations.isFetching}
        error={delegations.error}
        onRetry={() => void delegations.refetch()}
        empty={{
          title: "Aucune délégation",
          hint: canDelegate ? "Déléguez une validation avant une absence : la personne pourra valider en votre nom." : "Les délégations que vous recevez s'affichent ici.",
        }}
      />
    </Page>
  )
}
