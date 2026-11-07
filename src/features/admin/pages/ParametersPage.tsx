import { ChevronDown, History, Loader2, Pencil } from "lucide-react"
import { useId, useState } from "react"

import { ApiError, fieldErrors, userMessage } from "@/api"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Notice } from "@/components/sifec/notice"
import { cn } from "@/lib/utils"

import { useParameterHistory, useParameters, useSetParameter, type Parameter } from "../api"

const MODULES: Record<string, string> = {
  alerts: "Alertes",
  bids: "Dossiers",
  experts: "Experts",
  staffing: "Affectation des experts",
  qualifications: "Qualifications",
  precedents: "Dossiers témoins",
  conformity: "Contrôle de conformité",
  financial: "Offre financière",
  ai: "Intelligence artificielle",
  evaluation: "Banc de recette",
}
const ORDER = Object.keys(MODULES)

/** Critères du score de similarité des dossiers témoins. */
const WEIGHT_LABEL: Record<string, string> = {
  nature: "Nature de la mission",
  donor_procedure: "Bailleur et procédure",
  forms: "Formulaires",
  sector_client: "Secteur et client",
  age: "Ancienneté",
  result: "Résultat",
}
const weightLabel = (name: string) => WEIGHT_LABEL[name] ?? name

/** Refus du serveur, dans ses mots : bornes, type, somme des pondérations, date d'effet. */
function messageOf(error: unknown): string {
  if (error instanceof ApiError && error.code === "invalid") return Object.values(fieldErrors(error.details)).flat().join(" ") || userMessage(error)
  return userMessage(error)
}

const when = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
const decimal = (value: unknown) => String(value).replace(".", ",")

/** Valeur d'un paramètre, lisible : virgule décimale, oui ou non, listes séparées. */
function formatValue(kind: string, value: unknown): string {
  if (value === null || value === undefined) return ""
  switch (kind) {
    case "bool":
      return value ? "Oui" : "Non"
    case "decimal":
      return decimal(value)
    case "int_list":
      return Array.isArray(value) ? value.join(", ") : String(value)
    case "weights":
      return Object.entries(value as Record<string, unknown>)
        .map(([name, weight]) => `${weightLabel(name)} ${decimal(weight)}`)
        .join(" · ")
    default:
      return String(value)
  }
}

type Draft = { text: string; flag: boolean; weights: Record<string, string> }

function draftOf(parameter: Parameter): Draft {
  const { kind, value } = parameter
  return {
    text: kind === "int_list" ? (value as number[]).join(", ") : kind === "decimal" ? decimal(value) : kind === "weights" || kind === "bool" ? "" : String(value),
    flag: kind === "bool" ? Boolean(value) : false,
    weights: kind === "weights" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([name, weight]) => [name, decimal(weight)])) : {},
  }
}

/** Valeur envoyée au serveur, qui la vérifie (bornes, type, somme des pondérations). */
function valueOf(kind: string, draft: Draft): unknown {
  const text = draft.text.trim()
  switch (kind) {
    case "bool":
      return draft.flag
    case "int":
      return text === "" || Number.isNaN(Number(text)) ? text : Number(text)
    case "decimal":
      return text.replace(",", ".")
    case "int_list":
      return text
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((item) => (Number.isNaN(Number(item)) ? item : Number(item)))
    case "weights":
      return Object.fromEntries(Object.entries(draft.weights).map(([name, weight]) => [name, weight.trim().replace(",", ".")]))
    default:
      return draft.text
  }
}

const HINT: Record<string, string> = {
  int: "Nombre entier.",
  decimal: "Nombre décimal, avec une virgule.",
  int_list: "Nombres entiers séparés par des virgules.",
  weights: "La somme des pondérations doit faire 1.",
}

function EditParameter({ parameter, onClose }: { parameter: Parameter; onClose: () => void }) {
  const id = useId()
  const save = useSetParameter()
  const [draft, setDraft] = useState(() => draftOf(parameter))
  const [effective, setEffective] = useState("")
  const [reason, setReason] = useState("")
  const sum = Object.values(draft.weights).reduce((total, weight) => total + (Number(weight.replace(",", ".")) || 0), 0)

  return (
    <form
      aria-label={`Modifier : ${parameter.description}`}
      className="mt-3 space-y-3 rounded-lg bg-muted/60 p-4"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate(
          {
            key: parameter.key,
            value: valueOf(parameter.kind, draft),
            reason: reason.trim(),
            ...(effective ? { effective_from: new Date(effective).toISOString() } : {}),
          },
          { onSuccess: onClose },
        )
      }}
    >
      <fieldset disabled={save.isPending} className="grid gap-x-5 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <legend className="sr-only">Nouvelle valeur</legend>
        {parameter.kind === "bool" ? (
          <div className="flex items-center gap-2.5 self-end pb-1.5">
            <Switch id={`${id}-value`} checked={draft.flag} onCheckedChange={(flag) => setDraft({ ...draft, flag })} />
            <Label htmlFor={`${id}-value`}>{draft.flag ? "Oui" : "Non"}</Label>
          </div>
        ) : parameter.kind === "weights" ? (
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-medium text-ink">Pondérations</legend>
            <div className="mt-1.5 grid gap-x-4 gap-y-2 sm:grid-cols-3">
              {Object.entries(draft.weights).map(([name, weight]) => (
                <div key={name} className="space-y-1">
                  <Label htmlFor={`${id}-${name}`} className="text-xs">
                    {weightLabel(name)}
                  </Label>
                  <Input
                    id={`${id}-${name}`}
                    inputMode="decimal"
                    value={weight}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        weights: {
                          ...draft.weights,
                          [name]: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <p className={cn("tabular mt-1.5 text-xs", Math.abs(sum - 1) < 1e-9 ? "text-ink-muted" : "font-semibold text-check")}>Somme : {decimal(Math.round(sum * 1000) / 1000)}</p>
          </fieldset>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-value`}>Nouvelle valeur</Label>
            <Input
              id={`${id}-value`}
              inputMode={parameter.kind === "int" || parameter.kind === "decimal" ? "decimal" : undefined}
              value={draft.text}
              aria-describedby={HINT[parameter.kind] ? `${id}-hint` : undefined}
              onChange={(event) => setDraft({ ...draft, text: event.target.value })}
            />
            {HINT[parameter.kind] ? (
              <p id={`${id}-hint`} className="text-xs text-ink-muted">
                {HINT[parameter.kind]}
              </p>
            ) : null}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-from`}>Prend effet le</Label>
          <Input id={`${id}-from`} type="datetime-local" value={effective} onChange={(event) => setEffective(event.target.value)} aria-describedby={`${id}-from-hint`} />
          <p id={`${id}-from-hint`} className="text-xs text-ink-muted">
            Vide : tout de suite. Une date passée est refusée.
          </p>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor={`${id}-reason`}>Raison du changement</Label>
          <Input id={`${id}-reason`} required placeholder="Journalisée avec la nouvelle valeur." value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
      </fieldset>
      {save.isError ? (
        <p role="alert" className="text-xs font-semibold text-block">
          {messageOf(save.error)}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={save.isPending || !reason.trim()}>
          {save.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
          Enregistrer
        </Button>
      </div>
    </form>
  )
}

function ParameterHistory({ parameter }: { parameter: Parameter }) {
  const history = useParameterHistory(parameter.key, true)
  if (history.isPending) return <Skeleton className="mt-3 h-4 w-[40%]" />
  if (history.isError) return <p className="mt-3 text-xs text-block">{userMessage(history.error)}</p>
  if (!history.data.length) return <p className="mt-3 text-xs text-ink-muted">Jamais modifié : la valeur par défaut s'applique.</p>
  return (
    <ol className="mt-3 space-y-1.5 border-l-2 border-line pl-3" aria-label={`Historique : ${parameter.description}`}>
      {history.data.map((row) => (
        <li key={`${row.effective_from}-${row.created_at}`} className="text-xs">
          <span className="tabular font-bold text-ink">{formatValue(parameter.kind, row.value)}</span>
          <span className="text-ink-muted"> à partir du {when.format(new Date(row.effective_from))}</span>
          <span className="text-ink-muted">
            {" "}
            · {row.set_by} · {row.reason}
          </span>
        </li>
      ))}
    </ol>
  )
}

function ParameterRow({ parameter }: { parameter: Parameter }) {
  const [editing, setEditing] = useState(false)
  const [history, setHistory] = useState(false)
  const value = formatValue(parameter.kind, parameter.value)
  const fallback = formatValue(parameter.kind, parameter.default)
  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-wrap items-start gap-x-5 gap-y-2">
        <div className="min-w-0 flex-[1_1_24rem]">
          <p className="text-[0.8125rem] font-semibold text-ink">{parameter.description}</p>
          <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-muted">{parameter.key}</p>
        </div>
        <div className="min-w-[8rem] text-right">
          <p className="tabular text-sm font-extrabold text-ink">{value}</p>
          {value !== fallback ? <p className="text-[0.6875rem] text-ink-muted">par défaut : {fallback}</p> : null}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" aria-expanded={history} onClick={() => setHistory(!history)}>
            <History data-icon="inline-start" aria-hidden="true" />
            Historique
            <ChevronDown className={cn("transition-transform", history && "rotate-180")} aria-hidden="true" />
          </Button>
          {editing ? null : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} aria-label={`Modifier : ${parameter.description}`}>
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Modifier
            </Button>
          )}
        </div>
      </div>
      {history ? <ParameterHistory parameter={parameter} /> : null}
      {editing ? <EditParameter parameter={parameter} onClose={() => setEditing(false)} /> : null}
    </li>
  )
}

/**
 * Paramètres métier (UC16) : seuils, délais, pondérations. Réservés au chef de département ;
 * chaque valeur est datée et motivée, la précédente reste, et un dossier rejoué à une date
 * antérieure revoit les réglages de cette date.
 */
export function ParametersPage() {
  const parameters = useParameters()
  const groups = new Map<string, Parameter[]>()
  for (const parameter of parameters.data ?? []) {
    const module = parameter.key.split(".")[0]
    groups.set(module, [...(groups.get(module) ?? []), parameter])
  }
  const modules = [...groups.keys()].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99))

  return (
    <Page>
      <header className="mb-6 max-w-[68ch]">
        <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Paramètres</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
          Les seuils et délais qui guident les contrôles et les alertes. Chaque changement est daté, motivé et journalisé ; l'ancienne valeur reste dans l'historique.
        </p>
      </header>
      {parameters.isError ? (
        <Notice tone="block" title="Paramètres indisponibles">
          {userMessage(parameters.error)}
        </Notice>
      ) : null}
      {parameters.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          {modules.map((module) => (
            <section key={module} aria-labelledby={`module-${module}`} className="rounded-xl bg-card ring-1 ring-line">
              <h2 id={`module-${module}`} className="border-b border-line px-4 py-3 text-sm font-extrabold text-ink">
                {MODULES[module] ?? module}
              </h2>
              <ul className="divide-y divide-line">
                {groups.get(module)?.map((parameter) => (
                  <ParameterRow key={parameter.key} parameter={parameter} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}
