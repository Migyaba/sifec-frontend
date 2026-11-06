import { Search, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

/** Recherche d'une liste : envoyée après une courte pause de frappe, pas à chaque touche. */
export function SearchBox({
  value,
  onSearch,
  label,
  placeholder,
  delay = 300,
}: {
  value: string
  onSearch: (value: string) => void
  label: string
  placeholder?: string
  delay?: number
}) {
  const [draft, setDraft] = useState(value)
  const [shown, setShown] = useState(value)
  const latest = useRef(onSearch)
  useEffect(() => {
    latest.current = onSearch
  }, [onSearch])

  // L'adresse a changé ailleurs (retour arrière, lien) : on reprend sa valeur.
  if (value !== shown) {
    setShown(value)
    setDraft(value)
  }

  useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => latest.current(draft), delay)
    return () => clearTimeout(timer)
  }, [draft, value, delay])

  return (
    <label className="relative block w-full max-w-sm">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      <input
        type="search"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSearch(draft)
        }}
        className="h-9 w-full rounded-lg border border-line-strong bg-card pr-9 pl-9 text-sm placeholder:text-ink-muted focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/25 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft("")
            onSearch("")
          }}
          className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-muted hover:text-ink"
          aria-label="Effacer la recherche"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </label>
  )
}
