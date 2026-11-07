import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronDown, Plus } from "lucide-react"
import { useState } from "react"

import { api, ApiError, call, fieldErrors, userMessage, type components } from "@/api"
import { Page } from "@/components/sifec/page"
import { Notice } from "@/components/sifec/notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type S = components["schemas"]

const today = () => new Date().toISOString().slice(0, 10)
const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })
const formatDay = (value?: string | null) => (value ? day.format(new Date(`${value}T12:00:00`)) : "")
const money = (amount: string | null | undefined, currency: string) =>
  amount === null || amount === undefined
    ? ""
    : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: currency === "XOF" || currency === "XAF" ? 0 : 2 }).format(Number(amount))} ${currency}`

const UNIT: Record<string, string> = { day: "Jour", night: "Nuitée", trip: "Voyage, billet", km: "Kilomètre", month: "Mois", flat: "Forfait" }
const BASE: Record<string, string> = { fees: "Honoraires", reimbursables: "Frais remboursables", all: "Honoraires et frais remboursables" }

/** Message d'une erreur de saisie : messages par champ, sinon message général. */
function messageOf(error: unknown): string {
  if (error instanceof ApiError && error.code === "invalid") return Object.values(fieldErrors(error.details)).flat().join(" ")
  return userMessage(error)
}

function FormError({ error }: { error: unknown }) {
  return error ? (
    <p role="alert" className="text-xs font-semibold text-block">
      {messageOf(error)}
    </p>
  ) : null
}

/** Nouvelle valeur datée et motivée : la précédente reste dans l'historique, rien n'est écrasé. */
function NewAmount({
  label,
  onSave,
  pending,
  error,
}: {
  label: string
  onSave: (values: { amount: string; currency: string; effective_from: string; reason: string }) => void
  pending: boolean
  error: unknown
}) {
  const [values, setValues] = useState({ amount: "", currency: "XOF", effective_from: today(), reason: "" })
  const id = label.replace(/\W+/g, "-")
  return (
    <form
      className="grid gap-3 rounded-lg bg-ground p-3 ring-1 ring-line sm:grid-cols-[1fr_6rem_10rem]"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(values)
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={`${id}-amount`}>{label}</Label>
        <Input id={`${id}-amount`} type="number" min={0} step="any" required value={values.amount} onChange={(event) => setValues({ ...values, amount: event.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-currency`}>Devise</Label>
        <Input id={`${id}-currency`} maxLength={3} value={values.currency} onChange={(event) => setValues({ ...values, currency: event.target.value.toUpperCase() })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-from`}>Prend effet le</Label>
        <Input id={`${id}-from`} type="date" required value={values.effective_from} onChange={(event) => setValues({ ...values, effective_from: event.target.value })} />
      </div>
      <div className="space-y-1 sm:col-span-3">
        <Label htmlFor={`${id}-reason`}>Raison du changement</Label>
        <Input id={`${id}-reason`} required placeholder="Journalisée avec la nouvelle valeur." value={values.reason} onChange={(event) => setValues({ ...values, reason: event.target.value })} />
      </div>
      <div className="flex items-center justify-between gap-3 sm:col-span-3">
        <FormError error={error} />
        <Button type="submit" size="sm" className="ml-auto" disabled={pending || !values.amount || !values.reason.trim()}>
          Enregistrer
        </Button>
      </div>
    </form>
  )
}

function History({ rows }: { rows: { key: string; amount: string; currency: string; from: string; reason: string }[] }) {
  if (!rows.length) return <p className="text-xs text-ink-muted">Aucune valeur enregistrée.</p>
  return (
    <ol className="space-y-1 text-[0.8125rem]">
      {[...rows]
        .sort((a, b) => b.from.localeCompare(a.from))
        .map((row) => (
          <li key={row.key} className="flex flex-wrap gap-x-3">
            <span className="tabular font-semibold text-ink">{money(row.amount, row.currency)}</span>
            <span className="text-ink-muted">depuis le {formatDay(row.from)}</span>
            <span className="text-ink-muted">· {row.reason}</span>
          </li>
        ))}
    </ol>
  )
}

function CategoryHistory({ category }: { category: S["RateCategory"] }) {
  const client = useQueryClient()
  const rates = useQuery({
    queryKey: ["pricing", "rates", category.id],
    queryFn: () => call(api.GET("/api/v1/rate-categories/{id}/rates/", { params: { path: { id: category.id } } })),
  })
  const add = useMutation({
    mutationFn: (values: { amount: string; currency: string; effective_from: string; reason: string }) =>
      call(
        api.POST("/api/v1/rate-categories/{id}/rates/", {
          params: { path: { id: category.id } },
          body: { daily_rate: values.amount, currency: values.currency, effective_from: values.effective_from, reason: values.reason },
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["pricing"] }),
  })
  return (
    <div className="space-y-3 px-4 pb-4">
      <History rows={(rates.data ?? []).map((rate) => ({ key: rate.id, amount: rate.daily_rate, currency: rate.currency ?? "XOF", from: rate.effective_from, reason: rate.reason }))} />
      <NewAmount label={`Nouveau taux journalier : ${category.name}`} onSave={(values) => add.mutate(values)} pending={add.isPending} error={add.error} />
    </div>
  )
}

function NewCode({ title, unit, onSave, pending, error }: { title: string; unit?: boolean; onSave: (values: { code: string; name: string; unit: string }) => void; pending: boolean; error: unknown }) {
  const [values, setValues] = useState({ code: "", name: "", unit: "day" })
  return (
    <form
      aria-label={title}
      className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-line sm:grid-cols-[10rem_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(values)
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={`${title}-code`}>Code</Label>
        <Input id={`${title}-code`} required value={values.code} onChange={(event) => setValues({ ...values, code: event.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${title}-name`}>Intitulé</Label>
        <Input id={`${title}-name`} required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
      </div>
      {unit ? (
        <div className="space-y-1">
          <Label htmlFor={`${title}-unit`}>Unité</Label>
          <Select value={values.unit} onValueChange={(next) => setValues({ ...values, unit: next })}>
            <SelectTrigger id={`${title}-unit`} className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(UNIT).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className={cn("flex items-end", !unit && "sm:col-start-3")}>
        <Button type="submit" size="sm" disabled={pending || !values.code.trim() || !values.name.trim()}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Ajouter
        </Button>
      </div>
      <div className="sm:col-span-3">
        <FormError error={error} />
      </div>
    </form>
  )
}

function Expandable({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onToggle} aria-expanded={open}>
      {label}
      <ChevronDown data-icon="inline-end" className={cn("transition-transform", open && "rotate-180")} aria-hidden="true" />
    </Button>
  )
}

/** Barème des honoraires : taux journalier par catégorie d'expert, en vigueur à une date. */
function RateCard() {
  const client = useQueryClient()
  const [at, setAt] = useState(today())
  const [open, setOpen] = useState<string | null>(null)
  const card = useQuery({ queryKey: ["pricing", "card", at], queryFn: () => call(api.GET("/api/v1/rate-card/", { params: { query: { at } } })) })
  const categories = useQuery({ queryKey: ["pricing", "categories"], queryFn: () => call(api.GET("/api/v1/rate-categories/")) })
  const create = useMutation({
    mutationFn: (values: { code: string; name: string }) => call(api.POST("/api/v1/rate-categories/", { body: { code: values.code.trim(), name: values.name.trim() } })),
    onSuccess: () => client.invalidateQueries({ queryKey: ["pricing"] }),
  })
  const byCode = new Map((categories.data ?? []).map((category) => [category.code, category]))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="card-at">En vigueur au</Label>
          <Input id="card-at" type="date" value={at} onChange={(event) => setAt(event.target.value || today())} className="w-44" />
        </div>
        <p className="max-w-[60ch] text-xs text-ink-muted">L'offre d'un dossier prend le barème en vigueur à sa date limite de dépôt.</p>
      </div>
      {card.isError ? <Notice tone="block" title="Barème indisponible">{userMessage(card.error)}</Notice> : null}
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-line">
        <Table>
          <caption className="sr-only">Barème des honoraires</caption>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Taux journalier</TableHead>
              <TableHead>Depuis le</TableHead>
              <TableHead>
                <span className="sr-only">Historique</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(card.data ?? []).map((line) => {
              const category = byCode.get(line.category_code)
              const expanded = open === line.category_code
              return [
                <TableRow key={line.category_code}>
                  <TableCell className="font-semibold">{line.category_name}</TableCell>
                  <TableCell className="tabular text-right">{line.daily_rate ? money(line.daily_rate, line.currency) : <span className="text-check">Aucun taux à cette date</span>}</TableCell>
                  <TableCell className="text-ink-muted">{formatDay(line.effective_from)}</TableCell>
                  <TableCell className="text-right">{category ? <Expandable label="Historique" open={expanded} onToggle={() => setOpen(expanded ? null : line.category_code)} /> : null}</TableCell>
                </TableRow>,
                expanded && category ? (
                  <TableRow key={`${line.category_code}-history`} className="hover:bg-transparent">
                    <TableCell colSpan={4} className="whitespace-normal">
                      <CategoryHistory category={category} />
                    </TableCell>
                  </TableRow>
                ) : null,
              ]
            })}
          </TableBody>
        </Table>
        {card.data && !card.data.length ? <p className="px-4 py-3 text-[0.8125rem] text-ink-muted">Aucune catégorie d'expert : ajoutez la première.</p> : null}
      </div>
      <NewCode title="Nouvelle catégorie d'expert" onSave={(values) => create.mutate(values)} pending={create.isPending} error={create.error} />
    </div>
  )
}

function ItemHistory({ item }: { item: S["ReimbursableItem"] }) {
  const client = useQueryClient()
  const costs = useQuery({
    queryKey: ["pricing", "costs", item.id],
    queryFn: () => call(api.GET("/api/v1/reimbursable-items/{id}/costs/", { params: { path: { id: item.id } } })),
  })
  const add = useMutation({
    mutationFn: (values: { amount: string; currency: string; effective_from: string; reason: string }) =>
      call(
        api.POST("/api/v1/reimbursable-items/{id}/costs/", {
          params: { path: { id: item.id } },
          body: { unit_cost: values.amount, currency: values.currency, effective_from: values.effective_from, reason: values.reason },
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["pricing"] }),
  })
  return (
    <div className="space-y-3 px-4 pb-4">
      <History rows={(costs.data ?? []).map((cost) => ({ key: cost.id, amount: cost.unit_cost, currency: cost.currency ?? "XOF", from: cost.effective_from, reason: cost.reason }))} />
      <NewAmount label={`Nouveau coût unitaire : ${item.name}`} onSave={(values) => add.mutate(values)} pending={add.isPending} error={add.error} />
    </div>
  )
}

/** Frais remboursables : billets, nuitées, per diem… avec leur coût unitaire daté. */
function Reimbursables() {
  const client = useQueryClient()
  const [open, setOpen] = useState<string | null>(null)
  const items = useQuery({ queryKey: ["pricing", "items"], queryFn: () => call(api.GET("/api/v1/reimbursable-items/")) })
  const create = useMutation({
    mutationFn: (values: { code: string; name: string; unit: string }) =>
      call(api.POST("/api/v1/reimbursable-items/", { body: { code: values.code.trim(), name: values.name.trim(), unit: values.unit as S["UnitEnum"] } })),
    onSuccess: () => client.invalidateQueries({ queryKey: ["pricing"] }),
  })
  return (
    <div className="space-y-4">
      {items.isError ? <Notice tone="block" title="Frais indisponibles">{userMessage(items.error)}</Notice> : null}
      <ul className="divide-y divide-line rounded-xl bg-card ring-1 ring-line" aria-label="Frais remboursables">
        {(items.data ?? []).map((item) => {
          const expanded = open === item.id
          return (
            <li key={item.id}>
              <div className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 text-[0.8125rem] font-semibold text-ink">{item.name}</span>
                <span className="text-xs text-ink-muted">Par {UNIT[item.unit]?.toLowerCase() ?? item.unit}</span>
                {item.active ? null : <span className="text-xs text-ink-muted">Inactif</span>}
                <Expandable label="Coûts" open={expanded} onToggle={() => setOpen(expanded ? null : item.id)} />
              </div>
              {expanded ? <ItemHistory item={item} /> : null}
            </li>
          )
        })}
        {items.data && !items.data.length ? <li className="px-4 py-3 text-[0.8125rem] text-ink-muted">Aucun frais remboursable : ajoutez le premier.</li> : null}
      </ul>
      <NewCode title="Nouveau frais remboursable" unit onSave={(values) => create.mutate(values)} pending={create.isPending} error={create.error} />
    </div>
  )
}

/** Taxes en vigueur à une date. La règle fiscale de l'avis prime toujours (H7). */
function Taxes() {
  const client = useQueryClient()
  const [at, setAt] = useState(today())
  const [values, setValues] = useState({ code: "", name: "", rate: "", base: "all", effective_from: today(), reason: "" })
  const rules = useQuery({ queryKey: ["pricing", "taxes", at], queryFn: () => call(api.GET("/api/v1/tax-rules/", { params: { query: { at } } })) })
  const create = useMutation({
    mutationFn: () =>
      call(
        api.POST("/api/v1/tax-rules/", {
          body: {
            code: values.code.trim(),
            name: values.name.trim(),
            rate: String(Number(values.rate) / 100),
            base: values.base as S["BaseEnum"],
            effective_from: values.effective_from,
            reason: values.reason.trim(),
          },
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["pricing"] }),
  })
  const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 2 })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="taxes-at">En vigueur au</Label>
          <Input id="taxes-at" type="date" value={at} onChange={(event) => setAt(event.target.value || today())} className="w-44" />
        </div>
        <p className="max-w-[60ch] text-xs text-ink-muted">La règle fiscale de l'avis prime toujours : un avis hors taxes ou exonéré l'emporte sur ces taxes.</p>
      </div>
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-line">
        <Table>
          <caption className="sr-only">Taxes en vigueur</caption>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead>Taxe</TableHead>
              <TableHead className="text-right">Taux</TableHead>
              <TableHead>Assiette</TableHead>
              <TableHead>Depuis le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rules.data ?? []).map((rule) => (
              <TableRow key={`${rule.code}-${rule.effective_from}`}>
                <TableCell className="font-semibold">{rule.name}</TableCell>
                <TableCell className="tabular text-right">{percent.format(Number(rule.rate))}</TableCell>
                <TableCell className="text-ink-muted">{BASE[rule.base] ?? rule.base}</TableCell>
                <TableCell className="text-ink-muted">{formatDay(rule.effective_from)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rules.data && !rules.data.length ? <p className="px-4 py-3 text-[0.8125rem] text-ink-muted">Aucune taxe en vigueur à cette date.</p> : null}
      </div>
      <form
        aria-label="Nouvelle taxe"
        className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-line sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault()
          create.mutate()
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="tax-code">Code</Label>
          <Input id="tax-code" required value={values.code} onChange={(event) => setValues({ ...values, code: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tax-name">Intitulé</Label>
          <Input id="tax-name" required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tax-rate">Taux (%)</Label>
          <Input id="tax-rate" type="number" min={0} max={100} step="any" required value={values.rate} onChange={(event) => setValues({ ...values, rate: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tax-base">Assiette</Label>
          <Select value={values.base} onValueChange={(next) => setValues({ ...values, base: next })}>
            <SelectTrigger id="tax-base" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BASE).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="tax-from">Prend effet le</Label>
          <Input id="tax-from" type="date" required value={values.effective_from} onChange={(event) => setValues({ ...values, effective_from: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tax-reason">Raison</Label>
          <Input id="tax-reason" required value={values.reason} onChange={(event) => setValues({ ...values, reason: event.target.value })} />
        </div>
        <div className="flex items-center justify-between gap-3 sm:col-span-3">
          <FormError error={create.error} />
          <Button type="submit" size="sm" className="ml-auto" disabled={create.isPending || !values.code.trim() || !values.rate || !values.reason.trim()}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Ajouter la taxe
          </Button>
        </div>
      </form>
    </div>
  )
}

/**
 * Tarification (synthèse, M8) : barème des honoraires, frais remboursables et taxes. Réservée au
 * chef de département et aux personnes qu'il désigne. Chaque valeur est datée et motivée ;
 * l'historique reste, pour qu'une offre se recalcule à l'identique.
 */
export function PricingPage() {
  return (
    <Page>
      <header className="mb-6 max-w-[68ch]">
        <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Tarification</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
          Les montants qui servent au calcul des offres. Une nouvelle valeur prend effet à sa date ; la précédente reste dans l'historique, avec sa raison.
        </p>
      </header>
      <Tabs defaultValue="bareme">
        <TabsList>
          <TabsTrigger value="bareme">Barème des honoraires</TabsTrigger>
          <TabsTrigger value="frais">Frais remboursables</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
        </TabsList>
        <TabsContent value="bareme" className="mt-4">
          <RateCard />
        </TabsContent>
        <TabsContent value="frais" className="mt-4">
          <Reimbursables />
        </TabsContent>
        <TabsContent value="taxes" className="mt-4">
          <Taxes />
        </TabsContent>
      </Tabs>
    </Page>
  )
}
