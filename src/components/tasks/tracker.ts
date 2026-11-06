/**
 * Suivi des tâches longues : préremplissage, extraction, rédaction, contrôle, montage, campagnes.
 * L'API répond 202, puis l'interface interroge jusqu'au résultat (plan de l'interface, §4.7).
 * Le suivi vit hors des écrans : la personne peut changer de page, le résultat est annoncé.
 */
import { ApiError, NetworkError, userMessage } from "@/api"

export type Outcome = { ok: boolean; message: string }

export type TaskSpec<T> = {
  /** Une même tâche n'est suivie qu'une fois. */
  id: string
  label: string
  poll: () => Promise<T>
  /** `null` tant que la tâche tourne, puis son issue. */
  outcome: (result: T) => Outcome | null
  /** Écran à ouvrir pour voir le résultat. */
  href?: string
  onSettled?: (result: T | undefined, outcome: Outcome) => void
}

export type TrackedTask = {
  id: string
  label: string
  status: "running" | "done" | "failed"
  message?: string
  href?: string
  startedAt: number
}

/** Pauses entre deux interrogations : rapides au début, puis espacées. */
export const DELAYS = [1000, 2000, 3000, 5000, 8000, 10_000]
const MAX_FAILURES = 5

export function delayFor(attempt: number): number {
  return DELAYS[Math.min(attempt, DELAYS.length - 1)]
}

/** Pour une requête suivie à l'écran : `refetchInterval` qui s'arrête quand la tâche est finie. */
export function taskInterval<T>(isDone: (data: T | undefined) => boolean) {
  return (query: { state: { data: T | undefined; dataUpdateCount: number } }) =>
    isDone(query.state.data) ? false : delayFor(query.state.dataUpdateCount)
}

type Announce = (task: TrackedTask) => void

let tasks: TrackedTask[] = []
const listeners = new Set<() => void>()
let announce: Announce = () => {}

function emit() {
  tasks = [...tasks]
  listeners.forEach((listener) => listener())
}

function update(id: string, changes: Partial<TrackedTask>) {
  tasks = tasks.map((task) => (task.id === id ? { ...task, ...changes } : task))
  emit()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function snapshot(): TrackedTask[] {
  return tasks
}

/** L'application fournit la façon d'annoncer une tâche finie (notification). */
export function setAnnouncer(next: Announce) {
  announce = next
}

export function dismiss(id: string) {
  tasks = tasks.filter((task) => task.id !== id || task.status === "running")
  emit()
}

export function track<T>(spec: TaskSpec<T>): void {
  if (tasks.some((task) => task.id === spec.id && task.status === "running")) return
  tasks = [
    ...tasks.filter((task) => task.id !== spec.id),
    { id: spec.id, label: spec.label, status: "running", href: spec.href, startedAt: Date.now() },
  ]
  emit()

  const finish = (result: T | undefined, outcome: Outcome) => {
    update(spec.id, { status: outcome.ok ? "done" : "failed", message: outcome.message })
    const task = tasks.find((item) => item.id === spec.id)
    if (task) announce(task)
    spec.onSettled?.(result, outcome)
  }

  let attempt = 0
  let failures = 0
  const tick = async () => {
    try {
      const result = await spec.poll()
      failures = 0
      const outcome = spec.outcome(result)
      if (outcome) return finish(result, outcome)
    } catch (error) {
      const transient = error instanceof NetworkError || (error instanceof ApiError && error.status >= 500)
      failures += 1
      if (!transient || failures >= MAX_FAILURES) {
        return finish(undefined, { ok: false, message: `Suivi interrompu : ${userMessage(error)}` })
      }
    }
    setTimeout(() => void tick(), delayFor(attempt++))
  }
  setTimeout(() => void tick(), delayFor(attempt++))
}

/** Pour les tests. */
export function resetTasks() {
  tasks = []
  emit()
}
