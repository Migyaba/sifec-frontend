import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError, NetworkError } from "@/api"

import { delayFor, resetTasks, setAnnouncer, snapshot, taskInterval, track, type TrackedTask } from "./tracker"

const announced: TrackedTask[] = []

beforeEach(() => {
  vi.useFakeTimers()
  announced.length = 0
  setAnnouncer((task) => announced.push(task))
  resetTasks()
})
afterEach(() => vi.useRealTimers())

type Run = { status: "pending" | "running" | "succeeded" | "failed" }
const outcome = (run: Run) =>
  run.status === "succeeded" ? { ok: true, message: "Fiche préremplie." } : run.status === "failed" ? { ok: false, message: "Échec." } : null

describe("suivi des tâches longues", () => {
  it("interroge en s'espaçant jusqu'au résultat, puis l'annonce", async () => {
    const replies: Run[] = [{ status: "pending" }, { status: "running" }, { status: "succeeded" }]
    const poll = vi.fn(async () => replies.shift() as Run)

    track({ id: "prefill-1", label: "Préremplissage de la fiche", poll, outcome, href: "/experts/1" })
    expect(snapshot()).toMatchObject([{ id: "prefill-1", status: "running" }])

    await vi.advanceTimersByTimeAsync(1000 + 2000 + 3000)

    expect(poll).toHaveBeenCalledTimes(3)
    expect(announced).toMatchObject([{ status: "done", message: "Fiche préremplie.", href: "/experts/1" }])
  })

  it("ne suit pas deux fois la même tâche", () => {
    const poll = vi.fn(async () => ({ status: "running" }) as Run)
    track({ id: "t", label: "x", poll, outcome })
    track({ id: "t", label: "x", poll, outcome })
    expect(snapshot()).toHaveLength(1)
  })

  it("traverse une coupure passagère, mais s'arrête sur un refus", async () => {
    const replies: (Run | Error)[] = [new NetworkError(), { status: "succeeded" }]
    track({
      id: "a",
      label: "Extraction",
      poll: async () => {
        const next = replies.shift() as Run | Error
        if (next instanceof Error) throw next
        return next
      },
      outcome,
    })
    await vi.advanceTimersByTimeAsync(3000)
    expect(announced).toMatchObject([{ id: "a", status: "done" }])

    track({ id: "b", label: "Contrôle", poll: async () => Promise.reject(new ApiError(403, "permission_denied", "")), outcome })
    await vi.advanceTimersByTimeAsync(1000)
    expect(announced.at(-1)).toMatchObject({ id: "b", status: "failed" })
    expect(announced.at(-1)?.message).toContain("Suivi interrompu")
  })

  it("donne aux requêtes un intervalle qui s'arrête à la fin", () => {
    const interval = taskInterval<Run>((run) => run?.status === "succeeded")
    expect(interval({ state: { data: { status: "running" }, dataUpdateCount: 0 } })).toBe(delayFor(0))
    expect(interval({ state: { data: { status: "running" }, dataUpdateCount: 40 } })).toBe(10_000)
    expect(interval({ state: { data: { status: "succeeded" }, dataUpdateCount: 3 } })).toBe(false)
  })
})
