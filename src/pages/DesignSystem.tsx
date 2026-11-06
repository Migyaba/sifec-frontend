import { ArrowRight, Download, FileUp, Loader2, Plus, RotateCcw, SearchX } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { BrandMark, Wordmark } from "@/components/sifec/brand"
import { ConfidenceTag, LEVELS, Missing, Proof, type Level } from "@/components/sifec/confidence"
import { Deadline } from "@/components/sifec/deadline"
import { Notice } from "@/components/sifec/notice"
import { Pathway, ValidationGlyph, type Step } from "@/components/sifec/pathway"
import { cn } from "@/lib/utils"

/* Données de démonstration : toutes fictives. */

const DDP_STEPS: Step[] = [
  { key: "depot", label: "Dépôt de l'avis", by: "Collaborateur", state: "done" },
  { key: "extraction", label: "Fiche d'exigences", by: "Agent", state: "done" },
  { key: "exigences", label: "Validation des exigences", by: "Chef de pôle", validation: true, state: "done" },
  { key: "go", label: "Go / No-Go", by: "Chef de département", validation: true, state: "done" },
  { key: "contenus", label: "Choix des contenus", by: "Agent, chef de pôle", state: "done" },
  { key: "methodo", label: "Méthodologie et planning", by: "Agent", state: "current" },
  { key: "technique", label: "Validation technique", by: "Chef de pôle", validation: true, state: "todo" },
  { key: "offre", label: "Calcul de l'offre", by: "Agent", state: "todo" },
  { key: "prix", label: "Prix final", by: "Chef de département", validation: true, state: "todo" },
  { key: "controle", label: "Contrôle de conformité", by: "Agent", state: "todo" },
  { key: "finale", label: "Validation finale et export", by: "Chef de département", validation: true, state: "todo" },
]

const REQUIREMENTS: { label: string; value?: React.ReactNode; level: Level; page?: number; doc: string }[] = [
  { label: "Date limite de dépôt", value: "18 novembre 2026, 10 h", level: "ok", page: 1, doc: "Avis DDP 014-2026.pdf" },
  { label: "Expérience du cabinet", value: "3 missions similaires depuis 2021", level: "ok", page: 6, doc: "Avis DDP 014-2026.pdf" },
  { label: "Chef de mission", value: "Expert-comptable, 10 ans d'expérience", level: "check", page: 7, doc: "Additif n° 1 (scan).pdf" },
  { label: "Attestation de régularité fiscale", value: "Expire le 30 octobre 2026", level: "block", page: 9, doc: "Attestation fiscale 2026.pdf" },
  { label: "Montant de la garantie de soumission", level: "block", doc: "Avis DDP 014-2026.pdf" },
]

const EXPERTS = [
  { name: "Expert A", role: "Chef de mission", days: 20, rate: 250000, cv: "ok" as Level, load: "62 %" },
  { name: "Expert B", role: "Auditeur senior", days: 15, rate: 180000, cv: "check" as Level, load: "84 %" },
  { name: "Expert C", role: "Fiscaliste", days: 8, rate: 180000, cv: "ok" as Level, load: "40 %" },
]

const money = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-line pt-10 pb-12 first:border-t-0">
      <div className="mb-6 max-w-[68ch]">
        <h2 id={`${id}-title`} className="text-xl font-extrabold text-ink">
          {title}
        </h2>
        {intro ? <p className="mt-1.5 text-[0.9375rem] text-ink-muted">{intro}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Specimen({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className={cn("rounded-xl bg-card p-5 ring-1 ring-line", className)}>
      <figcaption className="mb-4 text-xs font-bold text-ink-muted">{label}</figcaption>
      {children}
    </figure>
  )
}

function Swatch({ name, hex, note, dark }: { name: string; hex: string; note?: string; dark?: boolean }) {
  return (
    <div className="min-w-0">
      <div
        className={cn("flex h-16 items-end rounded-lg p-2 ring-1 ring-black/5", dark ? "text-white" : "text-ink")}
        style={{ background: hex }}
      >
        <span className="tabular text-2xs font-bold uppercase">{hex}</span>
      </div>
      <div className="mt-1.5 text-xs font-bold text-ink">{name}</div>
      {note ? <div className="text-2xs leading-snug text-ink-muted">{note}</div> : null}
    </div>
  )
}

function DossierInContext() {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-line">
      <div className="flex flex-col gap-4 border-b border-line px-6 py-5 xl:flex-row xl:items-start xl:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-muted">
            <span className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-800">DDP</span>
            <span>Réf. 014/2026</span>
            <span aria-hidden="true">·</span>
            <span>Ministère fictif de la Santé</span>
          </div>
          <h3 className="mt-1.5 max-w-[48ch] text-lg leading-snug font-extrabold text-ink">
            Audit financier et comptable du projet d'appui aux districts sanitaires
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Deadline date="18 nov." daysLeft={12} />
          <Button variant="outline">
            <Download data-icon="inline-start" aria-hidden="true" />
            Fiche d'exigences
          </Button>
          <Button>
            Rédiger la méthodologie
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto px-6 py-6">
        <Pathway steps={DDP_STEPS} />
      </div>
      <div className="grid gap-0 border-t border-line lg:grid-cols-[1fr_20rem]">
        <div className="px-6 py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-extrabold text-ink">Exigences de l'avis</h4>
            <span className="text-xs text-ink-muted">5 sur 42 affichées</span>
          </div>
          <ul className="divide-y divide-line">
            {REQUIREMENTS.map((row) => (
              <li key={row.label} className="grid gap-1 py-2.5 sm:grid-cols-[14rem_1fr] sm:gap-4">
                <span className="text-[0.8125rem] text-ink-muted">{row.label}</span>
                <span className="text-[0.8125rem]">
                  {row.value ? (
                    <Proof
                      level={row.level}
                      source={{
                        document: row.doc,
                        page: row.page,
                        extractedOn: "4 nov. 2026",
                        validatedBy: row.level === "ok" ? "Chef de pôle, le 5 nov. 2026" : undefined,
                        note:
                          row.level === "block"
                            ? "Pièce expirée avant la date limite : à renouveler."
                            : row.level === "check"
                              ? "Lu sur un scan : à confirmer sur l'original."
                              : undefined,
                      }}
                    >
                      {row.value}
                    </Proof>
                  ) : (
                    <Missing what={row.label} />
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="space-y-3 border-t border-line bg-ground/60 px-6 py-5 lg:border-t-0 lg:border-l">
          <h4 className="text-sm font-extrabold text-ink">Avant l'export</h4>
          <Notice tone="block" title="2 points bloquent l'export">
            Attestation fiscale expirée, garantie de soumission sans valeur.
          </Notice>
          <Notice tone="check" title="1 donnée à vérifier">
            Exigence lue sur un additif scanné.
          </Notice>
          <p className="text-xs text-ink-muted">Le contrôle de conformité renvoie chaque point à l'étape en cause.</p>
        </aside>
      </div>
    </div>
  )
}

export function DesignSystemPage() {
  const [busy, setBusy] = useState(false)

  return (
    <div className="mx-auto max-w-[76rem] px-6 pt-8 pb-24 lg:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[64ch]">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Système de design</h1>
          <p className="mt-2 text-[0.9375rem] text-ink-muted">
            Les couleurs du Cabinet, et une règle : dans l'outil, le vert et l'orange disent l'état d'une preuve. Ils ne
            décorent rien. Toutes les données de cette page sont fictives.
          </p>
        </div>
        <nav aria-label="Sections" className="flex flex-wrap gap-1 text-xs font-semibold">
          {[
            ["situation", "En situation"],
            ["couleurs", "Couleurs"],
            ["texte", "Texte"],
            ["preuve", "Preuve"],
            ["actions", "Actions"],
            ["champs", "Champs"],
            ["tableaux", "Tableaux"],
            ["retours", "Retours"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-md px-2 py-1 text-ink-muted transition-colors hover:bg-muted hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <Section id="situation" title="En situation" intro="Un dossier DDP au milieu de son parcours : où il en est, ce qui le bloque, d'où vient chaque valeur.">
        <DossierInContext />
      </Section>

      <Section
        id="couleurs"
        title="Couleurs"
        intro="Les cinq couleurs du site sifec.net. Le bleu porte l'action ; le bleu nuit, le cadre ; le vert et l'orange, les niveaux de confiance."
      >
        <div className="space-y-8">
          <div>
            <h3 className="mb-3 text-sm font-bold text-ink">Marque</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Swatch name="Vert SIFEC" hex="#8C9E1D" note="Marque, niveau vérifié" dark />
              <Swatch name="Vert vif" hex="#B3C741" note="Repère actif sur le cadre" />
              <Swatch name="Bleu SIFEC" hex="#205A9A" note="Actions, liens, sélection" dark />
              <Swatch name="Bleu ciel" hex="#1177A8" note="Focus" dark />
              <Swatch name="Orange" hex="#F68C40" note="Niveau à vérifier" />
              <Swatch name="Bleu nuit" hex="#14365E" note="Cadre de l'application" dark />
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold text-ink">Surfaces et texte</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Swatch name="Fond" hex="#F6F7F2" note="Légèrement olive" />
              <Swatch name="Surface" hex="#FFFFFF" />
              <Swatch name="Filet" hex="#E3E5DC" />
              <Swatch name="Texte" hex="#111827" note="17,7 sur blanc" dark />
              <Swatch name="Texte secondaire" hex="#4B5563" note="7,0 sur le fond" dark />
              <Swatch name="Bloquant" hex="#B42318" note="6,6 sur blanc" dark />
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold text-ink">Niveaux de confiance</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {(Object.keys(LEVELS) as Level[]).map((level) => (
                <div key={level} className={cn("rounded-xl p-4", LEVELS[level].soft)}>
                  <ConfidenceTag level={level} className="bg-white/70" />
                  <p className={cn("mt-2 text-[0.8125rem] leading-snug font-semibold", LEVELS[level].text)}>{LEVELS[level].meaning}.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="texte"
        title="Texte"
        intro="Nunito Sans pour toute l'interface, Nunito pour le nom du produit, comme sur le logo. Échelle fixe et serrée ; chiffres à chasse fixe dans les montants."
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <Specimen label="Échelle">
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <span className="w-14 text-2xs font-bold text-ink-muted">28</span>
                <span className="text-[1.75rem] leading-tight font-extrabold">Avis et dossiers</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-14 text-2xs font-bold text-ink-muted">20</span>
                <span className="text-xl font-extrabold">Proposition technique</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-14 text-2xs font-bold text-ink-muted">16</span>
                <span className="text-base font-bold">Exigences de l'avis</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-14 text-2xs font-bold text-ink-muted">14</span>
                <span className="text-sm">
                  Le chef de mission justifie de dix années d'expérience dans l'audit de projets financés par les bailleurs.
                </span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-14 text-2xs font-bold text-ink-muted">12</span>
                <span className="text-xs text-ink-muted">Extrait le 4 novembre 2026, page 7 de l'additif n° 1.</span>
              </div>
            </div>
          </Specimen>
          <Specimen label="Nom et montants">
            <div className="flex items-center gap-3">
              <BrandMark className="size-10" />
              <Wordmark className="text-2xl" />
            </div>
            <div className="mt-6 space-y-1.5 text-sm">
              {[
                ["Honoraires", 7_700_000],
                ["Frais remboursables", 900_000],
                ["TVA 18 %", 1_548_000],
              ].map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-ink-muted">{label}</span>
                  <span className="tabular font-semibold">{money.format(amount as number)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t border-line pt-1.5 font-extrabold">
                <span>Total, francs CFA</span>
                <span className="tabular">{money.format(10_148_000)}</span>
              </div>
            </div>
          </Specimen>
        </div>
      </Section>

      <Section
        id="preuve"
        title="Preuve"
        intro="Toute valeur insérée dans un dossier montre son niveau et sa pièce source. Une valeur absente n'est jamais devinée."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Specimen label="Valeur et sa source (ouvrir la pastille)">
            <dl className="space-y-3 text-[0.8125rem]">
              <div>
                <dt className="text-ink-muted">RCCM</dt>
                <dd className="mt-0.5">
                  <Proof level="ok" source={{ document: "RCCM modifié 2025.pdf", page: 1, extractedOn: "2 nov. 2026", validatedBy: "Chef de pôle, le 3 nov. 2026" }}>
                    RB/COT/00 B 0000 (fictif)
                  </Proof>
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Diplôme du chef de mission</dt>
                <dd className="mt-0.5">
                  <Proof level="check" source={{ document: "CV Expert A (scan).pdf", page: 2, extractedOn: "2 nov. 2026", note: "Lu par OCR : à confirmer." }}>
                    DESCOGEF, 2012
                  </Proof>
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Attestation CNSS</dt>
                <dd className="mt-0.5">
                  <Proof level="block" source={{ document: "Attestation CNSS.pdf", page: 1, note: "Expirée le 30 sept. 2026." }}>
                    Valable jusqu'au 30 sept. 2026
                  </Proof>
                </dd>
              </div>
            </dl>
          </Specimen>
          <Specimen label="Niveaux">
            <div className="flex flex-wrap gap-2">
              <ConfidenceTag level="ok" />
              <ConfidenceTag level="check" />
              <ConfidenceTag level="block" />
            </div>
            <p className="mt-4 text-xs text-ink-muted">Icône et libellé, toujours : la couleur seule ne suffit pas.</p>
          </Specimen>
          <Specimen label="Valeur manquante">
            <div className="text-[0.8125rem] text-ink-muted">Garantie de soumission</div>
            <div className="mt-1">
              <Missing what="Garantie de soumission" />
            </div>
            <p className="mt-4 text-xs text-ink-muted">Aucune fiche ne donne la valeur : le dossier ne s'exporte pas.</p>
          </Specimen>
        </div>
        <Specimen label="Validations du parcours" className="mt-4">
          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-ink">
            <span className="inline-flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-[0.6rem] border-2 border-ok-dot bg-ok-soft text-ok">
                <ValidationGlyph className="size-5" checked />
              </span>
              Validée
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-[0.6rem] border-2 border-blue-600 bg-card text-blue-700 ring-4 ring-blue-100">
                <ValidationGlyph className="size-5" />
              </span>
              En attente de la personne désignée
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-[0.6rem] border-2 border-check-dot bg-check-soft text-check">
                <ValidationGlyph className="size-5" />
              </span>
              À refaire : une étape précédente a changé
            </span>
          </div>
          <p className="mt-4 max-w-[68ch] text-xs text-ink-muted">
            Le document coché du logo marque les validations humaines, et elles seules. Les étapes de l'agent restent des ronds numérotés.
          </p>
        </Specimen>
      </Section>

      <Section id="actions" title="Actions" intro="Un bouton plein par écran : l'action qui fait avancer le dossier. Les libellés disent ce qui se passe.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Specimen label="Variantes">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Valider la fiche</Button>
              <Button variant="outline">Renvoyer pour correction</Button>
              <Button variant="secondary">Enregistrer le brouillon</Button>
              <Button variant="ghost">Annuler</Button>
              <Button variant="destructive">Archiver le dossier</Button>
              <Button variant="link">Voir le journal</Button>
            </div>
          </Specimen>
          <Specimen label="Tailles et états">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">
                <Plus data-icon="inline-start" aria-hidden="true" />
                Ajouter
              </Button>
              <Button>
                <FileUp data-icon="inline-start" aria-hidden="true" />
                Déposer l'avis
              </Button>
              <Button size="lg">Exporter le dossier</Button>
              <Button disabled>Exporter le dossier</Button>
              <Button
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  setTimeout(() => setBusy(false), 1600)
                }}
              >
                {busy ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
                {busy ? "Contrôle en cours" : "Lancer le contrôle"}
              </Button>
            </div>
          </Specimen>
        </div>
      </Section>

      <Section id="champs" title="Champs" intro="Libellé au-dessus, aide en dessous, erreur qui dit quoi corriger.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Specimen label="Texte">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ref">Référence de l'avis</Label>
                <Input id="ref" defaultValue="DDP 014/2026" />
                <p className="text-xs text-ink-muted">Telle qu'imprimée sur l'avis.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ifu">IFU</Label>
                <Input id="ifu" defaultValue="3201" aria-invalid="true" aria-describedby="ifu-err" />
                <p id="ifu-err" className="text-xs font-semibold text-block">
                  L'IFU compte 13 chiffres. Vérifiez la pièce source.
                </p>
              </div>
            </div>
          </Specimen>
          <Specimen label="Choix">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Règle fiscale de l'offre</Label>
                <Select defaultValue="taxed">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="taxed">Toutes taxes comprises</SelectItem>
                    <SelectItem value="excluded">Hors taxes</SelectItem>
                    <SelectItem value="exempt">Exonérée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-start gap-2.5 text-[0.8125rem]">
                <Checkbox defaultChecked className="mt-0.5" />
                <span>L'expert a donné son accord pour l'usage de son CV</span>
              </label>
              <label className="flex items-center justify-between gap-3 text-[0.8125rem]">
                <span>Mode sans témoin</span>
                <Switch />
              </label>
            </div>
          </Specimen>
          <Specimen label="Motif">
            <div className="space-y-1.5">
              <Label htmlFor="motif">Motif de l'écart de prix</Label>
              <Textarea id="motif" rows={4} placeholder="Ce motif est journalisé avec la décision." />
            </div>
          </Specimen>
        </div>
      </Section>

      <Section id="tableaux" title="Tableaux" intro="Lignes serrées, chiffres alignés à droite, état lisible sans la couleur.">
        <Tabs defaultValue="equipe">
          <TabsList>
            <TabsTrigger value="equipe">Équipe proposée</TabsTrigger>
            <TabsTrigger value="vide">Sans résultat</TabsTrigger>
            <TabsTrigger value="chargement">Chargement</TabsTrigger>
          </TabsList>
          <TabsContent value="equipe" className="mt-3">
            <div className="overflow-hidden rounded-xl bg-card ring-1 ring-line">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead>Expert</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead className="text-right">Jours</TableHead>
                    <TableHead className="text-right">Taux journalier</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>CV</TableHead>
                    <TableHead className="text-right">Occupation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {EXPERTS.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-semibold">{row.name}</TableCell>
                      <TableCell className="text-ink-muted">{row.role}</TableCell>
                      <TableCell className="tabular text-right">{row.days}</TableCell>
                      <TableCell className="tabular text-right">{money.format(row.rate)}</TableCell>
                      <TableCell className="tabular text-right font-semibold">{money.format(row.days * row.rate)}</TableCell>
                      <TableCell>
                        <ConfidenceTag level={row.cv}>{row.cv === "ok" ? "À jour" : "Plus de 12 mois"}</ConfidenceTag>
                      </TableCell>
                      <TableCell className={cn("tabular text-right", row.load === "84 %" && "font-bold text-check")}>{row.load}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="vide" className="mt-3">
            <div className="grid place-items-center rounded-xl bg-card px-6 py-14 text-center ring-1 ring-line">
              <SearchX className="size-8 text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-ink">Aucun expert ne correspond à ce poste</p>
              <p className="mt-1 max-w-[52ch] text-[0.8125rem] text-ink-muted">
                Élargissez les années d'expérience, ou ajoutez la fiche d'un expert dans la base documentaire.
              </p>
              <Button variant="outline" className="mt-4">
                <RotateCcw data-icon="inline-start" aria-hidden="true" />
                Retirer les filtres
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="chargement" className="mt-3">
            <div className="space-y-2.5 rounded-xl bg-card p-5 ring-1 ring-line" aria-busy="true" aria-label="Chargement de l'équipe">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="ml-auto h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Section>

      <Section id="retours" title="Retours" intro="Ce qui s'est passé, puis ce qu'il faut faire. Les messages ne s'excusent pas et ne félicitent pas.">
        <div className="grid gap-3 lg:grid-cols-3">
          <Notice tone="info" title="Additif n° 1 reçu">
            La fiche d'exigences est relancée. Trois parties du dossier sont touchées.
          </Notice>
          <Notice tone="check" title="CV de plus de 12 mois">
            Demandez à l'expert de confirmer son CV avant la validation technique.
          </Notice>
          <Notice
            tone="block"
            title="Export impossible"
            action={
              <Button size="sm" variant="outline" className="bg-white/70">
                Voir les points
              </Button>
            }
          >
            Le rapport de conformité contient 2 points bloquants.
          </Notice>
        </div>
        <div className="mt-4">
          <Button variant="outline" onClick={() => toast.success("Fiche d'exigences validée", { description: "Le Go / No-Go est demandé au chef de département." })}>
            Afficher une confirmation
          </Button>
        </div>
      </Section>
    </div>
  )
}
