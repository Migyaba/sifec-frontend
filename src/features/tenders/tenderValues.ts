import type { Tender } from "./api"

export type TenderValues = {
  reference: string
  title: string
  procedure: string
  submission_deadline: string
  contracting_authority: string
  donor: string
  language: string
  nature: string
  sector: string
}

export const FIELDS = ["reference", "title", "procedure", "submission_deadline", "contracting_authority", "donor", "language", "nature", "sector"]

/** Valeur d'un champ date et heure (heure locale), sans les secondes. */
function localInput(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function valuesOf(tender?: Tender): TenderValues {
  return {
    reference: tender?.reference ?? "",
    title: tender?.title ?? "",
    procedure: tender?.procedure ?? "ami",
    submission_deadline: localInput(tender?.submission_deadline),
    contracting_authority: tender?.contracting_authority ?? "",
    donor: tender?.donor ?? "",
    language: tender?.language ?? "fr",
    nature: tender?.nature ?? "",
    sector: tender?.sector ?? "",
  }
}

export function payloadOf(values: TenderValues) {
  return {
    reference: values.reference.trim(),
    title: values.title.trim(),
    procedure: values.procedure,
    submission_deadline: values.submission_deadline ? new Date(values.submission_deadline).toISOString() : null,
    contracting_authority: values.contracting_authority || null,
    donor: values.donor || null,
    language: values.language,
    nature: values.nature,
    sector: values.sector.trim(),
  }
}
