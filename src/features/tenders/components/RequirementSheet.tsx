import { ListPlus, Loader2, RefreshCw, Sparkles, X } from "lucide-react"
import { useId, useState } from "react"

import { userMessage } from "@/api"
import { Notice } from "@/components/sifec/notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import { useAddRequirement, useExtract, useRequirements, useSheets, useTenderDocuments, type Category, type Sheet, type Tender, type TenderDocument } from "../api"
import { CATEGORIES, CATEGORY, DOCUMENT_KIND } from "../labels"
import { messageOf } from "../messages"
import { RequirementItem } from "./RequirementItem"

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

type Entry = { category: string; label: string; value?: string; before?: string; after?: string }
type Changes = { added?: Entry[]; modified?: Entry[]; to_confirm?: Entry[] }

/** Ce qu'une nouvelle version change, d'ordinaire après un additif (UC14). */
function SheetChanges({ sheet, trigger }: { sheet: Sheet; trigger?: TenderDocument }) {
  const changes = (sheet.changes ?? {}) as Changes
  const added = changes.added ?? []
  const modified = changes.modified ?? []
  const toConfirm = changes.to_confirm ?? []
  const category = (key: string) => CATEGORY[key as Category] ?? key
  return (
    <section aria-labelledby={`changes-${sheet.id}`} className="border-b border-line bg-blue-50/50 px-4 py-3.5">
      <h3 id={`changes-${sheet.id}`} className="text-sm font-extrabold text-ink">
        Ce qui change depuis la version {sheet.number - 1}
        {trigger ? <span className="font-semibold text-ink-muted"> · après « {trigger.label || trigger.document_title} »</span> : null}
      </h3>
      {!added.length && !modified.length && !toConfirm.length ? (
        <p className="mt-1 text-[0.8125rem] text-ink-muted">Aucune différence : la fiche est la même.</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-[0.8125rem]">
          {modified.map((entry) => (
            <li key={`m-${entry.category}-${entry.label}`}>
              <span className="font-bold text-check">Modifié</span> · {category(entry.category)} · <span className="font-semibold text-ink">{entry.label}</span> :{" "}
              <span className="text-ink-muted line-through">{entry.before}</span> <span aria-label="devient">→</span> <span className="font-semibold text-ink">{entry.after}</span>
            </li>
          ))}
          {added.map((entry) => (
            <li key={`a-${entry.category}-${entry.label}`}>
              <span className="font-bold text-blue-700">Ajouté</span> · {category(entry.category)} · <span className="font-semibold text-ink">{entry.label}</span> : {entry.value}
            </li>
          ))}
          {toConfirm.map((entry) => (
            <li key={`c-${entry.category}-${entry.label}`}>
              <span className="font-bold text-check">Non retrouvé, gardé</span> · {category(entry.category)} · <span className="font-semibold text-ink">{entry.label}</span> : {entry.value}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AddRequirement({ tenderId, sheet, documents, onClose }: { tenderId: string; sheet: Sheet; documents: TenderDocument[]; onClose: () => void }) {
  const id = useId()
  const add = useAddRequirement(tenderId)
  const [values, setValues] = useState({ category: "" as Category | "", label: "", value: "", document: "", page: "", quote: "", section: "" })
  const set = (patch: Partial<typeof values>) => setValues({ ...values, ...patch })
  return (
    <form
      aria-label="Ajouter une exigence"
      className="space-y-3 border-t border-line px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!values.category) return
        add.mutate(
          {
            sheet: sheet.id,
            category: values.category,
            label: values.label.trim(),
            value: values.value.trim(),
            document_version_id: values.document || null,
            page_number: values.page ? Number(values.page) : null,
            quote: values.quote.trim(),
            section: values.section.trim(),
          },
          { onSuccess: onClose },
        )
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-ink">Ajouter une exigence oubliée</h3>
          <p className="mt-0.5 text-xs text-ink-muted">Citez la page qui la donne : l'extrait est recherché dans le texte lu.</p>
        </div>
        <Button type="button" size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fermer">
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-category`}>Rubrique</Label>
          <Select value={values.category} onValueChange={(category) => set({ category: category as Category })}>
            <SelectTrigger id={`${id}-category`} className="w-full">
              <SelectValue placeholder="Choisir une rubrique" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {CATEGORY[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-label`}>Intitulé</Label>
          <Input id={`${id}-label`} value={values.label} placeholder="Garantie de soumission" onChange={(event) => set({ label: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-value`}>Valeur</Label>
          <Input id={`${id}-value`} value={values.value} onChange={(event) => set({ value: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-document`}>Document cité</Label>
          <Select value={values.document || "aucun"} onValueChange={(document) => set({ document: document === "aucun" ? "" : document })}>
            <SelectTrigger id={`${id}-document`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aucun">Sans citation</SelectItem>
              {documents.map((document) => (
                <SelectItem key={document.id} value={document.document_version}>
                  {document.label || document.document_title} ({DOCUMENT_KIND[document.kind]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-page`}>Page</Label>
          <Input id={`${id}-page`} type="number" min={1} disabled={!values.document} value={values.page} onChange={(event) => set({ page: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-section`}>Article ou paragraphe</Label>
          <Input id={`${id}-section`} disabled={!values.document} value={values.section} onChange={(event) => set({ section: event.target.value })} />
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor={`${id}-quote`}>Extrait cité</Label>
          <Textarea id={`${id}-quote`} rows={2} disabled={!values.document} value={values.quote} onChange={(event) => set({ quote: event.target.value })} />
        </div>
      </div>
      {add.isError ? (
        <p role="alert" className="text-xs font-semibold text-block">
          {messageOf(add.error)}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={add.isPending || !values.category || !values.label.trim() || !values.value.trim()}>
          Ajouter l'exigence
        </Button>
      </div>
    </form>
  )
}

/** Exigences d'une version, rubrique par rubrique. */
function Requirements({ tenderId, sheet, documents, editable }: { tenderId: string; sheet: Sheet; documents: TenderDocument[]; editable: boolean }) {
  const [removed, setRemoved] = useState(false)
  const [adding, setAdding] = useState(false)
  const requirements = useRequirements(sheet.id, removed)
  const byVersion = new Map(documents.map((document) => [document.document_version, document]))
  const grouped = CATEGORIES.map((category) => ({ category, items: (requirements.data ?? []).filter((item) => item.category === category) }))
  const empty = grouped.filter((group) => !group.items.length).map((group) => CATEGORY[group.category])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Switch id={`removed-${sheet.id}`} checked={removed} onCheckedChange={setRemoved} />
          <Label htmlFor={`removed-${sheet.id}`} className="text-xs">
            Montrer les exigences retirées
          </Label>
        </div>
        {editable && !adding ? (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <ListPlus data-icon="inline-start" aria-hidden="true" />
            Ajouter une exigence
          </Button>
        ) : null}
      </div>
      {adding ? <AddRequirement tenderId={tenderId} sheet={sheet} documents={documents} onClose={() => setAdding(false)} /> : null}
      {requirements.isPending ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : requirements.isError ? (
        <p className="px-4 py-3 text-[0.8125rem] text-block">{userMessage(requirements.error)}</p>
      ) : (
        <>
          {grouped
            .filter((group) => group.items.length)
            .map((group) => (
              <section key={group.category} aria-labelledby={`cat-${sheet.id}-${group.category}`} className="border-b border-line last:border-b-0">
                <h3 id={`cat-${sheet.id}-${group.category}`} className="bg-muted/50 px-4 py-2 text-xs font-extrabold tracking-wide text-ink uppercase">
                  {CATEGORY[group.category]} <span className="font-semibold text-ink-muted">· {group.items.length}</span>
                </h3>
                <ul className="divide-y divide-line">
                  {group.items.map((requirement) => (
                    <RequirementItem
                      key={requirement.id}
                      requirement={requirement}
                      source={requirement.document_version ? byVersion.get(requirement.document_version) : undefined}
                      tenderId={tenderId}
                      editable={editable}
                    />
                  ))}
                </ul>
              </section>
            ))}
          {empty.length ? <p className="px-4 py-3 text-xs text-ink-muted">Rien relevé dans : {empty.join(", ")}. Si l'avis en parle, ajoutez l'exigence.</p> : null}
        </>
      )}
    </>
  )
}

/**
 * Fiche d'exigences (UC07) : extraite des documents de l'avis, rubrique par rubrique, chaque
 * point avec la page qui le dit. Seule la dernière version prête se corrige ; les précédentes
 * restent consultables. Un additif crée une nouvelle version, comparée à la précédente.
 */
export function RequirementSheetPanel({ tender }: { tender: Tender }) {
  const documents = useTenderDocuments(tender.id)
  const sheets = useSheets(tender.id, tender.extraction_pending)
  const extract = useExtract(tender.id)
  const [chosen, setChosen] = useState<string | null>(null)
  const list = sheets.data ?? []
  const latest = list[0]
  const current = list.find((sheet) => sheet.status === "ready")
  const shown = list.find((sheet) => sheet.id === chosen) ?? current
  const editable = Boolean(shown && current && shown.id === current.id)
  const hasDocuments = Boolean(documents.data?.length)
  const pending = tender.extraction_pending && !(latest?.status === "extracting")
  const trigger = shown?.trigger ? documents.data?.find((document) => document.id === shown.trigger) : undefined

  const extractButton = (label: string, variant: "default" | "outline" = "default") => (
    <Button size="sm" variant={variant} disabled={!hasDocuments || extract.isPending || pending || latest?.status === "extracting"} onClick={() => extract.mutate()}>
      {extract.isPending ? (
        <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
      ) : variant === "default" ? (
        <Sparkles data-icon="inline-start" aria-hidden="true" />
      ) : (
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
      )}
      {label}
    </Button>
  )

  return (
    <section aria-labelledby="sheet-title" className="rounded-xl bg-card ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 id="sheet-title" className="text-sm font-extrabold text-ink">
            Fiche d'exigences
          </h2>
          {shown ? (
            <p className="mt-0.5 text-xs text-ink-muted">
              Version {shown.number}, extraite le {when.format(new Date(shown.finished_at ?? shown.created_at))}
              {!editable ? " · version antérieure, en lecture seule" : ""}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {list.length > 1 ? (
            <Select value={shown?.id ?? ""} onValueChange={setChosen}>
              <SelectTrigger className="w-52" aria-label="Version de la fiche">
                <SelectValue placeholder="Version" />
              </SelectTrigger>
              <SelectContent>
                {list
                  .filter((sheet) => sheet.status === "ready")
                  .map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id}>
                      Version {sheet.number}
                      {sheet.id === current?.id ? " (en vigueur)" : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : null}
          {list.length ? extractButton("Relancer l'extraction", "outline") : null}
        </div>
      </div>

      <div className="space-y-3 px-4 py-3 empty:hidden">
        {extract.isError ? (
          <Notice tone="block" title="Extraction refusée">
            {messageOf(extract.error)}
          </Notice>
        ) : null}
        {pending ? (
          <Notice tone="info" title="Extraction demandée">
            Elle démarrera dès que la lecture des documents de l'avis sera finie.
          </Notice>
        ) : null}
        {latest?.status === "extracting" ? (
          <div role="status" className="space-y-1.5">
            <p className="text-[0.8125rem] font-semibold text-ink">
              Extraction de la version {latest.number} en cours : {(latest.rubrics_done as string[]).length} rubriques sur {CATEGORIES.length}
            </p>
            <Progress value={((latest.rubrics_done as string[]).length / CATEGORIES.length) * 100} aria-label="Avancement de l'extraction" />
            {current ? <p className="text-xs text-ink-muted">La version {current.number} reste en vigueur jusqu'à la fin.</p> : null}
          </div>
        ) : null}
        {latest?.status === "failed" ? (
          <Notice tone="block" title={`Extraction de la version ${latest.number} en échec`} action={extractButton("Relancer", "outline")}>
            {latest.error || "Le fournisseur d'IA n'a pas répondu."}
            {current ? ` La version ${current.number} reste en vigueur.` : ""}
          </Notice>
        ) : null}
        {shown && shown.open_points > 0 ? (
          <Notice tone="check" title={shown.open_points > 1 ? `${shown.open_points} points à trancher` : "1 point à trancher"}>
            Tranchez-les avant la validation de la fiche : confirmez ou corrigez chaque point en orange.
          </Notice>
        ) : null}
        {shown && (shown.warnings as string[]).length
          ? (shown.warnings as string[]).map((warning) => (
              <Notice key={warning} tone="check" title="À vérifier">
                {warning}
              </Notice>
            ))
          : null}
      </div>

      {!list.length && !sheets.isPending && !pending ? (
        <div className="px-4 pb-5">
          <p className="max-w-[68ch] text-[0.8125rem] text-ink-muted">
            {hasDocuments
              ? "Les documents sont rattachés : l'IA lit l'avis rubrique par rubrique et cite, pour chaque exigence, la page qui la donne. Rien n'est retenu sans relecture."
              : "Déposez d'abord l'avis et ses documents ; l'extraction les lira tous."}
          </p>
          <div className="mt-3">{extractButton("Extraire la fiche d'exigences")}</div>
        </div>
      ) : null}

      {shown && shown.number > 1 ? <SheetChanges sheet={shown} trigger={trigger} /> : null}
      {shown ? <Requirements key={shown.id} tenderId={tender.id} sheet={shown} documents={documents.data ?? []} editable={editable} /> : null}
      {shown && editable ? (
        <p className="border-t border-line px-4 py-2.5 text-xs text-ink-muted">
          {shown.open_points === 0 ? "Aucun point à trancher. " : ""}La fiche est validée par le chef de pôle dans le parcours du dossier ; une correction après sa validation la remet à valider.
        </p>
      ) : null}
    </section>
  )
}
