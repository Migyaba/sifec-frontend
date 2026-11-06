import { AlertCircle, CheckCircle2, FileUp, Loader2, RotateCcw, X } from "lucide-react"
import { useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { UploadItem } from "./useUploads"

const size = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 })

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 ** 2) return `${size.format(bytes / 1024)} Ko`
  if (bytes < 1024 ** 3) return `${size.format(bytes / 1024 ** 2)} Mo`
  return `${size.format(bytes / 1024 ** 3)} Go`
}

/** Zone de dépôt : glisser-déposer ou sélection classique, plusieurs fichiers à la fois. */
export function FileDrop({
  onFiles,
  accept,
  multiple = true,
  hint = "PDF, Word, Excel ou image. Plusieurs fichiers à la fois.",
  disabled = false,
}: {
  onFiles: (files: FileList) => void
  accept?: string
  multiple?: boolean
  hint?: string
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const id = useId()

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        if (!disabled && event.dataTransfer.files.length) onFiles(event.dataTransfer.files)
      }}
      className={cn(
        "flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors duration-200",
        over ? "border-blue-500 bg-blue-50" : "border-line-strong bg-card",
        disabled && "opacity-50",
      )}
    >
      <FileUp className={cn("size-7", over ? "text-blue-600" : "text-ink-muted")} strokeWidth={1.75} aria-hidden="true" />
      <p className="mt-2 text-sm font-bold text-ink">Glissez les fichiers ici</p>
      <p className="mt-0.5 text-xs text-ink-muted" id={`${id}-hint`}>
        {hint}
      </p>
      <Button type="button" variant="outline" className="mt-4" disabled={disabled} onClick={() => input.current?.click()}>
        Choisir des fichiers
      </Button>
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept={accept}
        multiple={multiple}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files)
          event.target.value = ""
        }}
      />
    </div>
  )
}

function StatusIcon({ status }: { status: UploadItem["status"] }) {
  if (status === "done") return <CheckCircle2 className="size-4 text-ok" aria-hidden="true" />
  if (status === "uploading") return <Loader2 className="size-4 animate-spin text-blue-600" aria-hidden="true" />
  return <AlertCircle className={cn("size-4", status === "failed" ? "text-block" : "text-check")} aria-hidden="true" />
}

const STATUS: Record<UploadItem["status"], string> = {
  uploading: "Envoi",
  paused: "Interrompu",
  failed: "Refusé",
  done: "Reçu, traitement en cours",
}

/** Avancement de chaque dépôt, avec reprise après une coupure. */
export function UploadList({
  items,
  onResume,
  onRemove,
}: {
  items: UploadItem[]
  onResume: (id: string) => void
  onRemove: (id: string) => void
}) {
  if (!items.length) return null
  return (
    <ul className="mt-3 divide-y divide-line rounded-xl bg-card ring-1 ring-line" aria-label="Dépôts">
      {items.map((item) => {
        const percent = item.size ? Math.round((item.sent / item.size) * 100) : 0
        return (
          <li key={item.id} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <StatusIcon status={item.status} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.8125rem] font-semibold text-ink">{item.name}</div>
                <div className="tabular text-2xs text-ink-muted">
                  {STATUS[item.status]}
                  {item.status === "uploading" || item.status === "paused" ? ` · ${percent} %` : null} ·{" "}
                  {formatBytes(item.size)}
                </div>
              </div>
              {item.status === "paused" ? (
                <Button size="sm" variant="outline" onClick={() => onResume(item.id)}>
                  <RotateCcw data-icon="inline-start" aria-hidden="true" />
                  Reprendre
                </Button>
              ) : null}
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onRemove(item.id)}
                aria-label={item.status === "uploading" ? `Annuler l'envoi de ${item.name}` : `Retirer ${item.name} de la liste`}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            {item.status === "uploading" || item.status === "paused" ? (
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Envoi de ${item.name}`}
              >
                <div
                  className={cn("h-full rounded-full transition-[width] duration-300 ease-out-expo", item.status === "paused" ? "bg-check-dot" : "bg-blue-600")}
                  style={{ width: `${percent}%` }}
                />
              </div>
            ) : null}
            {item.error ? (
              <p className={cn("mt-1.5 text-xs font-semibold", item.status === "failed" ? "text-block" : "text-check")}>{item.error}</p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
