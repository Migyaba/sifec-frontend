import { useCallback, useEffect, useRef, useState } from "react"

import { asUploadError, sendFile, startSession, type DocumentVersion, type UploadSession } from "./engine"

export type UploadItem = {
  id: string
  name: string
  size: number
  status: "uploading" | "paused" | "failed" | "done"
  sent: number
  error?: string
  version?: DocumentVersion
}

type Entry = { file: File; session?: UploadSession; controller?: AbortController }

let counter = 0

/**
 * Dépôts en cours d'un écran. Une coupure met le dépôt en pause, reprenable ; quitter la page
 * pendant un envoi demande confirmation au navigateur.
 */
export function useUploads({ documentId, onDone }: { documentId?: string; onDone?: (version: DocumentVersion) => void } = {}) {
  const [items, setItems] = useState<UploadItem[]>([])
  const entries = useRef(new Map<string, Entry>())
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  }, [onDone])

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)))
  }, [])

  const run = useCallback(
    async (id: string) => {
      const entry = entries.current.get(id)
      if (!entry) return
      const controller = new AbortController()
      entry.controller = controller
      patch(id, { status: "uploading", error: undefined })
      try {
        entry.session ??= await startSession(entry.file, documentId)
        const version = await sendFile(entry.file, entry.session, {
          signal: controller.signal,
          onProgress: (bytes) => patch(id, { sent: bytes }),
        })
        patch(id, { status: "done", sent: entry.file.size, version })
        done.current?.(version)
      } catch (error) {
        const failure = asUploadError(error)
        patch(id, { status: failure.resumable ? "paused" : "failed", error: failure.message })
      }
    },
    [documentId, patch],
  )

  const add = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        counter += 1
        const id = `upload-${counter}`
        entries.current.set(id, { file })
        setItems((current) => [...current, { id, name: file.name, size: file.size, status: "uploading", sent: 0 }])
        void run(id)
      }
    },
    [run],
  )

  const remove = useCallback((id: string) => {
    entries.current.get(id)?.controller?.abort()
    entries.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const busy = items.some((item) => item.status === "uploading")
  useEffect(() => {
    if (!busy) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [busy])

  useEffect(() => {
    const current = entries.current
    return () => current.forEach((entry) => entry.controller?.abort())
  }, [])

  return { items, add, resume: run, remove, busy }
}
