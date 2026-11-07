import { Controller, type Control, type UseFormRegister } from "react-hook-form"

import { Field } from "@/components/forms"

import { OrganizationPicker, type OrganizationRole } from "./components/OrganizationPicker"
import { DocumentPicker } from "./components/ProofPanel"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

/** Description d'un champ de fiche : le formulaire, l'affichage et l'envoi en découlent. */
export type FieldDef = {
  name: string
  label: string
  kind: "text" | "textarea" | "date" | "year" | "number" | "select" | "boolean" | "organization" | "tags" | "document" | "json"
  options?: Record<string, string>
  /** Organisation : rôle recherché (client, bailleur…), ou entités du Cabinet seulement. */
  role?: OrganizationRole
  entity?: boolean
  /** Fixé à la création (l'organisation d'une fiche), puis non modifiable. */
  createOnly?: boolean
  /** Calculé par le serveur : affiché, jamais envoyé. */
  readOnly?: boolean
  /** Valeur proposée à la création (la devise XOF…). */
  defaultValue?: string
  required?: boolean
  help?: string
  /** Occupe toute la largeur du formulaire. */
  wide?: boolean
}

export type FormValues = Record<string, string | boolean>

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })

export function displayValue(def: FieldDef, value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  if (def.kind === "date") return day.format(new Date(`${String(value)}T12:00:00`))
  if (def.kind === "boolean") return value ? "Oui" : "Non"
  if (def.kind === "tags") return Array.isArray(value) ? value.join(", ") : String(value)
  if (def.kind === "json") return Array.isArray(value) ? `${value.length} élément(s)` : ""
  if (def.kind === "select") return def.options?.[String(value)] ?? String(value)
  return String(value)
}

export function defaultsOf(defs: FieldDef[], row?: Record<string, unknown>): FormValues {
  return Object.fromEntries(
    defs.map((def) => {
      const value = row?.[def.name]
      if (def.kind === "boolean") return [def.name, Boolean(value)]
      if (def.kind === "tags") return [def.name, Array.isArray(value) ? value.join(", ") : ""]
      if (def.kind === "json") return [def.name, JSON.stringify(value ?? [], null, 2)]
      if (!row && def.defaultValue !== undefined) return [def.name, def.defaultValue]
      return [def.name, value === null || value === undefined ? "" : String(value)]
    }),
  )
}

/**
 * Ce qui part au serveur : dates et nombres vides deviennent nuls, années et nombres en nombres,
 * choix vides omis, textes vides omis à la création.
 */
export function payloadOf(defs: FieldDef[], values: FormValues, only?: Partial<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const def of defs) {
    if (def.readOnly || (only && !only[def.name])) continue
    const value = values[def.name]
    // Un choix laissé vide n'est pas envoyé : le serveur applique sa valeur par défaut. À la
    // création, un texte vide non plus ; en modification, vider un texte doit rester possible.
    if (def.kind === "select" && value === "") continue
    if (!only && (def.kind === "text" || def.kind === "textarea") && value === "") continue
    if (def.kind === "boolean") out[def.name] = Boolean(value)
    else if (def.kind === "organization" || def.kind === "document") out[def.name] = value === "" ? null : value
    else if (def.kind === "json") out[def.name] = String(value).trim() ? JSON.parse(String(value)) : []
    else if (def.kind === "tags")
      out[def.name] = String(value)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    else if (def.kind === "year" || def.kind === "number") out[def.name] = value === "" ? null : Number(value)
    else if (def.kind === "date") out[def.name] = value === "" ? null : value
    else out[def.name] = value
  }
  return out
}

/** Un champ de formulaire selon sa description, relié à react-hook-form. */
export function FieldControl({
  def,
  register,
  control,
  editing = false,
  documentTitle,
}: {
  def: FieldDef
  register: UseFormRegister<FormValues>
  control: Control<FormValues>
  /** Fiche existante : les champs fixés à la création ne se modifient plus. */
  editing?: boolean
  /** Titre du document déjà choisi (champ « document »). */
  documentTitle?: string
}) {
  const className = def.wide ? "sm:col-span-2" : undefined
  const locked = def.readOnly || (def.createOnly && editing)
  if (def.kind === "document") {
    return (
      <Field name={def.name} label={def.label} required={def.required} help={def.help} className={className ?? "sm:col-span-2"}>
        {() => (
          <Controller
            control={control}
            name={def.name}
            render={({ field }) => (
              <DocumentPicker
                picked={field.value ? { versionId: String(field.value), title: documentTitle ?? "Pièce choisie", pages: 0 } : null}
                onPick={(picked) => field.onChange(picked?.versionId ?? "")}
              />
            )}
          />
        )}
      </Field>
    )
  }
  if (def.kind === "organization") {
    return (
      <Field name={def.name} label={def.label} required={def.required} help={def.help} className={className}>
        {() => (
          <Controller
            control={control}
            name={def.name}
            render={({ field }) => (
              <OrganizationPicker
                value={String(field.value ?? "")}
                onChange={field.onChange}
                role={def.role}
                entity={def.entity}
                label={def.label}
                disabled={locked}
              />
            )}
          />
        )}
      </Field>
    )
  }
  if (def.kind === "select") {
    return (
      <Field name={def.name} label={def.label} required={def.required} help={def.help} className={className}>
        {(a11y) => (
          <Controller
            control={control}
            name={def.name}
            render={({ field }) => (
              <Select value={String(field.value ?? "")} onValueChange={field.onChange} disabled={locked}>
                <SelectTrigger className="w-full" {...a11y}>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(def.options ?? {}).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </Field>
    )
  }
  if (def.kind === "boolean") {
    return (
      <Controller
        control={control}
        name={def.name}
        render={({ field }) => (
          <label className="flex items-center gap-2.5 self-end pb-2 text-[0.8125rem]">
            <Checkbox checked={Boolean(field.value)} onCheckedChange={(value) => field.onChange(value === true)} />
            {def.label}
          </label>
        )}
      />
    )
  }
  return (
    <Field name={def.name} label={def.label} required={def.required} help={def.help} className={className}>
      {def.kind === "json" ? (
        <Textarea
          rows={8}
          readOnly={locked}
          spellCheck={false}
          className="font-mono text-xs"
          {...register(def.name, { validate: (value) => isJson(String(value)) || "JSON invalide : vérifiez les crochets, les virgules et les guillemets." })}
        />
      ) : def.kind === "textarea" ? (
        <Textarea rows={4} readOnly={locked} {...register(def.name)} />
      ) : (
        <Input
          readOnly={locked}
          type={def.kind === "date" ? "date" : def.kind === "year" || def.kind === "number" ? "number" : "text"}
          placeholder={def.kind === "tags" ? "Séparés par des virgules" : undefined}
          inputMode={def.kind === "year" || def.kind === "number" ? "numeric" : undefined}
          min={def.kind === "year" ? 1950 : undefined}
          max={def.kind === "year" ? 2100 : undefined}
          {...register(def.name)}
        />
      )}
    </Field>
  )
}

function isJson(value: string): boolean {
  if (!value.trim()) return true
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}
