import { ListChecks, Send } from "lucide-react"
import { useMemo, useState } from "react"

import { useConfirm } from "@/components/confirm"
import { DataTable, nextOrdering, Pagination, SearchBox, type Column } from "@/components/data"
import { Button } from "@/components/ui/button"
import { FileDrop, UploadList, type UploadItem } from "@/components/upload"
import { track } from "@/components/tasks"
import { ConfidenceTag, type Level } from "@/components/sifec/confidence"

/* Démonstration des composants transverses (lot F0.4), sur des données fictives. */

type Piece = { id: string; name: string; holder: string; expires: string; days: number; level: Level }

const PIECES: Piece[] = [
  { id: "1", name: "Attestation de régularité fiscale", holder: "Cabinet SIFEC", expires: "30 oct. 2026", days: -7, level: "block" },
  { id: "2", name: "Attestation CNSS", holder: "Cabinet SIFEC", expires: "12 déc. 2026", days: 36, level: "ok" },
  { id: "3", name: "Registre du commerce (RCCM)", holder: "Partenaire fictif", expires: "Sans échéance", days: 9999, level: "check" },
  { id: "4", name: "Quitus fiscal", holder: "Cabinet SIFEC", expires: "20 nov. 2026", days: 14, level: "check" },
]

const COLUMNS: Column<Piece>[] = [
  { key: "name", header: "Pièce", cell: (row) => <span className="font-semibold">{row.name}</span>, sortKey: "name" },
  { key: "holder", header: "Titulaire", cell: (row) => <span className="text-ink-muted">{row.holder}</span> },
  { key: "expires", header: "Échéance", cell: (row) => row.expires, sortKey: "days" },
  { key: "level", header: "État", cell: (row) => <ConfidenceTag level={row.level} /> },
]

const UPLOADS: UploadItem[] = [
  { id: "a", name: "Avis DDP 014-2026.pdf", size: 2_410_000, status: "done", sent: 2_410_000 },
  { id: "b", name: "Termes de référence.docx", size: 48_200_000, status: "uploading", sent: 32_000_000 },
  { id: "c", name: "Additif n° 1 (scan).pdf", size: 18_600_000, status: "paused", sent: 16_777_216, error: "Connexion interrompue. Le dépôt reprendra là où il s'est arrêté." },
  { id: "d", name: "Archive.exe", size: 900_000, status: "failed", sent: 0, error: "Ce type de fichier n'est pas accepté." },
]

export function CommonComponentsDemo() {
  const [q, setQ] = useState("")
  const [ordering, setOrdering] = useState("")
  const [page, setPage] = useState(1)
  const confirm = useConfirm()
  const [answer, setAnswer] = useState<string | null>(null)

  const rows = useMemo(() => {
    const found = PIECES.filter((row) => row.name.toLowerCase().includes(q.toLowerCase()))
    const key = ordering.replace("-", "") as keyof Piece
    if (!key) return found
    const sorted = [...found].sort((a, b) => String(a[key]).localeCompare(String(b[key]), "fr", { numeric: true }))
    return ordering.startsWith("-") ? sorted.reverse() : sorted
  }, [q, ordering])

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-bold text-ink">Liste servie par l'API</h3>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <SearchBox value={q} onSearch={setQ} label="Rechercher une pièce" placeholder="Rechercher une pièce…" />
          <span className="text-xs text-ink-muted">Recherche, tri et page vont dans l'adresse.</span>
        </div>
        <DataTable
          caption="Pièces administratives"
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => row.id}
          ordering={ordering}
          onSort={(key) => setOrdering(nextOrdering(ordering, key))}
          empty={{ title: "Aucune pièce ne correspond", hint: "Vérifiez l'orthographe, ou retirez un filtre." }}
        />
        <Pagination page={page} count={312} onPage={setPage} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-bold text-ink">Dépôt de fichiers</h3>
          <FileDrop onFiles={() => {}} />
          <UploadList items={UPLOADS} onResume={() => {}} onRemove={() => {}} />
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="mb-3 text-sm font-bold text-ink">Tâche longue</h3>
            <p className="mb-3 max-w-[56ch] text-[0.8125rem] text-ink-muted">
              Suivie hors de l'écran : on peut changer de page, le résultat est annoncé. L'indicateur apparaît dans la barre du haut.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                let polls = 0
                track({
                  id: `demo-${Date.now()}`,
                  label: "Extraction de la fiche d'exigences",
                  poll: async () => ++polls,
                  outcome: (count) => (count >= 3 ? { ok: true, message: "42 exigences extraites, 3 à vérifier." } : null),
                })
              }}
            >
              <ListChecks data-icon="inline-start" aria-hidden="true" />
              Lancer une extraction fictive
            </Button>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold text-ink">Confirmation</h3>
            <Button
              variant="outline"
              onClick={async () => {
                const result = await confirm({
                  title: "Renvoyer la fiche pour correction ?",
                  description: "La fiche repasse en brouillon chez son auteur, avec votre motif.",
                  confirmLabel: "Renvoyer",
                  reason: { label: "Motif du renvoi", minLength: 10 },
                })
                setAnswer(result ? `Motif journalisé : « ${result.reason} »` : "Renvoi abandonné.")
              }}
            >
              <Send data-icon="inline-start" aria-hidden="true" />
              Renvoyer pour correction
            </Button>
            {answer ? <p className="mt-2 text-xs text-ink-muted">{answer}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
