import { userMessage } from "@/api"
import { ValidationGlyph } from "@/components/sifec/pathway"

import { useVersions } from "../api"

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })

/** Versions publiées : rien n'est écrasé, et chaque validation porte un nom et une date. */
export function VersionsList({ recordType, recordId }: { recordType: string; recordId: string }) {
  const versions = useVersions(recordType, recordId)
  return (
    <section aria-labelledby="versions-title" className="rounded-xl bg-card ring-1 ring-line">
      <h2 id="versions-title" className="border-b border-line px-4 py-3 text-sm font-extrabold text-ink">
        Versions publiées
      </h2>
      {versions.isError ? (
        <p role="alert" className="px-4 py-3 text-xs font-semibold text-block">
          {userMessage(versions.error)}
        </p>
      ) : versions.data && !versions.data.length ? (
        <p className="px-4 py-3 text-[0.8125rem] text-ink-muted">Aucune version publiée pour l'instant.</p>
      ) : (
        <ol className="divide-y divide-line">
          {[...(versions.data ?? [])].reverse().map((version) => (
            <li key={version.id} className="flex items-start gap-2.5 px-4 py-2.5">
              <ValidationGlyph className="mt-0.5 size-4 shrink-0 text-ok" checked />
              <div className="text-[0.8125rem]">
                <div className="font-semibold text-ink">Version {version.number}</div>
                <div className="text-xs text-ink-muted">
                  Publiée le {when.format(new Date(version.published_at))}
                  {version.verifier_name ? ` par ${version.verifier_name}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
