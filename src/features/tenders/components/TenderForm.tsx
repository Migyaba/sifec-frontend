import { Loader2, Save } from "lucide-react"
import { Controller, FormProvider, useForm } from "react-hook-form"

import { applyServerErrors, Field, FormAlert } from "@/components/forms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MISSION_NATURE, OrganizationPicker, PROCEDURE } from "@/features/records"

import { LANGUAGE } from "../labels"
import { FIELDS, type TenderValues } from "../tenderValues"

/** Identification de l'avis : ce que l'on sait avant même d'avoir lu ses documents. */
export function TenderForm({
  initial,
  label,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: TenderValues
  label: string
  submitLabel: string
  pending: boolean
  onSubmit: (values: TenderValues, fail: (error: unknown) => void) => void
  onCancel?: () => void
}) {
  const form = useForm<TenderValues>({ defaultValues: initial })
  const select = (name: "procedure" | "language" | "nature", text: string, options: Record<string, string>, required = false, placeholder?: string) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Field name={name} label={text} required={required}>
          {(a11y) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger {...a11y} className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(options).map(([value, optionLabel]) => (
                  <SelectItem key={value} value={value}>
                    {optionLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      )}
    />
  )
  return (
    <FormProvider {...form}>
      <form noValidate aria-label={label} className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values, (error) => applyServerErrors(error, form.setError, FIELDS)))}>
        <FormAlert />
        <fieldset disabled={pending} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <legend className="sr-only">Identification de l'avis</legend>
          <Field name="reference" label="Référence" required>
            <Input placeholder="AMI n° 007/2026" {...form.register("reference", { required: "Indiquez la référence de l'avis." })} />
          </Field>
          {select("procedure", "Procédure", PROCEDURE, true)}
          <Field name="title" label="Intitulé" required className="sm:col-span-2">
            <Input {...form.register("title", { required: "Indiquez l'intitulé." })} />
          </Field>
          <Field name="submission_deadline" label="Date limite de dépôt" help="Celle de l'avis ; un additif peut la reporter.">
            <Input type="datetime-local" {...form.register("submission_deadline")} />
          </Field>
          {select("language", "Langue", LANGUAGE)}
          <Controller
            control={form.control}
            name="contracting_authority"
            render={({ field }) => <OrganizationPicker value={field.value} onChange={field.onChange} role="contracting_authority" label="Autorité contractante" />}
          />
          <Controller control={form.control} name="donor" render={({ field }) => <OrganizationPicker value={field.value} onChange={field.onChange} role="donor" label="Bailleur de fonds" />} />
          {select("nature", "Type de mission", MISSION_NATURE, false, "Choisir le type de mission")}
          <Field name="sector" label="Secteur">
            <Input placeholder="Eau et assainissement" {...form.register("sector")} />
          </Field>
        </fieldset>
        <div className="flex justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <Save data-icon="inline-start" aria-hidden="true" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
