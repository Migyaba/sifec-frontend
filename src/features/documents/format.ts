const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })
const dateTime = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

export function formatDate(value: string | null | undefined): string {
  if (!value) return ""
  // Une date seule (AAAA-MM-JJ) est lue à midi : pas de décalage de fuseau d'un jour.
  return date.format(new Date(value.length === 10 ? `${value}T12:00:00` : value))
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTime.format(new Date(value)) : ""
}

const short = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" })

/** Date courte pour les tableaux : « 6 nov. 2026 ». */
export function formatShortDate(value: string | null | undefined): string {
  return value ? short.format(new Date(value)) : ""
}
