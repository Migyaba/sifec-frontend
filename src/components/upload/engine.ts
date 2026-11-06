/**
 * Dépôt d'un fichier par morceaux, directement vers le stockage (guide de l'API, « Dépôt de
 * fichiers ») :
 * 1. `POST documents/uploads/` ouvre une session et donne l'adresse de chaque morceau ;
 * 2. chaque morceau part au stockage, qui renvoie son ETag ;
 * 3. `POST documents/uploads/{id}/complete/` avec la liste des ETags crée la version.
 * Après une coupure, `uploads/{id}/parts/` redonne des adresses pour les seuls morceaux manquants :
 * le dépôt reprend là où il s'était arrêté.
 */
import { api, ApiError, call, fieldErrors, NetworkError, type components } from "@/api"

export type DocumentVersion = components["schemas"]["DocumentVersion"]

export type UploadSession = {
  id: string
  partSize: number
  parts: number
  urls: Map<number, string>
  etags: Map<number, string>
}

export class UploadError extends Error {
  /** Une coupure se reprend ; un refus du serveur ou du stockage ne se reprend pas. */
  readonly resumable: boolean

  constructor(message: string, resumable: boolean, options?: ErrorOptions) {
    super(message, options)
    this.name = "UploadError"
    this.resumable = resumable
  }
}

export type UploadOptions = {
  documentId?: string
  signal?: AbortSignal
  concurrency?: number
  /** Octets reçus par le stockage. La progression avance morceau par morceau. */
  onProgress?: (sent: number, total: number) => void
  /** Pause entre deux essais d'un même morceau, en millisecondes. */
  retryDelays?: number[]
}

const DEFAULT_DELAYS = [1000, 3000]

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

function chunk(file: Blob, session: UploadSession, number: number): Blob {
  const start = (number - 1) * session.partSize
  return file.slice(start, Math.min(start + session.partSize, file.size))
}

async function putPart(url: string, body: Blob, signal?: AbortSignal): Promise<string> {
  let response: Response
  try {
    response = await globalThis.fetch(url, { method: "PUT", body, signal })
  } catch (cause) {
    if (signal?.aborted) throw cause
    throw new NetworkError(cause)
  }
  if (!response.ok) {
    // 403 : adresse expirée ; 5xx : stockage indisponible. Les deux se règlent en reprenant.
    throw new UploadError(`Le stockage a refusé un morceau (${response.status}).`, true)
  }
  const etag = response.headers.get("ETag")
  if (!etag) {
    throw new UploadError(
      "Le stockage ne transmet pas l'ETag des morceaux : sa configuration CORS doit exposer cet en-tête.",
      false,
    )
  }
  return etag
}

async function sendPart(file: Blob, session: UploadSession, number: number, options: UploadOptions): Promise<void> {
  const delays = options.retryDelays ?? DEFAULT_DELAYS
  for (let attempt = 0; ; attempt += 1) {
    const url = session.urls.get(number)
    if (!url) throw new UploadError("Adresse d'un morceau manquante.", true)
    try {
      session.etags.set(number, await putPart(url, chunk(file, session, number), options.signal))
      return
    } catch (error) {
      const retryable = error instanceof NetworkError || (error instanceof UploadError && error.resumable)
      if (options.signal?.aborted || !retryable || attempt >= delays.length) throw error
      await wait(delays[attempt], options.signal)
    }
  }
}

export async function startSession(file: File, documentId?: string): Promise<UploadSession> {
  const opened = await call(
    api.POST("/api/v1/documents/uploads/", {
      body: {
        filename: file.name,
        size: file.size,
        content_type: file.type || "application/octet-stream",
        ...(documentId ? { document_id: documentId } : {}),
      },
    }),
  )
  return {
    id: opened.id,
    partSize: opened.part_size,
    parts: opened.parts.length,
    urls: new Map(opened.parts.map((part) => [part.number, part.url])),
    etags: new Map(),
  }
}

/** Nouvelles adresses pour les morceaux pas encore reçus : celles d'avant ont pu expirer. */
async function refreshUrls(session: UploadSession): Promise<void> {
  const missing = Array.from({ length: session.parts }, (_, index) => index + 1).filter(
    (number) => !session.etags.has(number),
  )
  if (!missing.length) return
  const parts = await call(api.POST("/api/v1/documents/uploads/{id}/parts/", { params: { path: { id: session.id } }, body: { numbers: missing } }))
  for (const part of parts) session.urls.set(part.number, part.url)
}

function sent(file: Blob, session: UploadSession): number {
  let bytes = 0
  for (const number of session.etags.keys()) bytes += chunk(file, session, number).size
  return bytes
}

/**
 * Envoie les morceaux manquants de `session`, puis termine le dépôt. Appelée de nouveau avec la
 * même session après une coupure, elle reprend sans renvoyer ce qui est déjà reçu.
 */
export async function sendFile(file: File, session: UploadSession, options: UploadOptions = {}): Promise<DocumentVersion> {
  const resuming = session.etags.size > 0
  try {
    if (resuming) await refreshUrls(session)
    const queue = Array.from({ length: session.parts }, (_, index) => index + 1).filter(
      (number) => !session.etags.has(number),
    )
    options.onProgress?.(sent(file, session), file.size)
    const worker = async () => {
      for (let number = queue.shift(); number !== undefined; number = queue.shift()) {
        await sendPart(file, session, number, options)
        options.onProgress?.(sent(file, session), file.size)
      }
    }
    await Promise.all(Array.from({ length: Math.min(options.concurrency ?? 3, queue.length) }, worker))
    return await call(
      api.POST("/api/v1/documents/uploads/{id}/complete/", {
        params: { path: { id: session.id } },
        body: {
          parts: [...session.etags].sort(([a], [b]) => a - b).map(([number, etag]) => ({ number, etag })),
        },
      }),
    )
  } catch (error) {
    throw asUploadError(error)
  }
}

export function asUploadError(error: unknown): UploadError {
  if (error instanceof UploadError) return error
  if (error instanceof NetworkError) {
    return new UploadError("Connexion interrompue. Le dépôt reprendra là où il s'est arrêté.", true, { cause: error })
  }
  if (error instanceof ApiError) {
    const messages = error.code === "invalid" ? Object.values(fieldErrors(error.details)).flat() : []
    const detail = messages.length ? messages.join(" ") : error.code === "invalid" ? "Le serveur refuse ce fichier." : error.message
    return new UploadError(detail, error.status >= 500, { cause: error })
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return new UploadError("Dépôt annulé.", false, { cause: error })
  }
  return new UploadError("Le dépôt a échoué.", false, { cause: error })
}
