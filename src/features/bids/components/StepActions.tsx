import { ArrowRight, Check, CircleSlash, ListChecks, Loader2, Undo2 } from "lucide-react"
import { Link } from "react-router"

import { useConfirm } from "@/components/confirm"
import { ConfidenceTag } from "@/components/sifec/confidence"
import { Notice } from "@/components/sifec/notice"
import { ValidationGlyph } from "@/components/sifec/pathway"
import { Button } from "@/components/ui/button"

import { useCompleteStep, useCurrentSheet, useRejectStep, useValidateStep, type Bid, type Step } from "../api"
import { AUTOMATIC, performer } from "../labels"
import { problemsOf } from "../messages"

const GO = "go_no_go"
const REQUIREMENTS = "validation_exigences"

function Problems({ title, error }: { title: string; error: unknown }) {
  const problems = problemsOf(error)
  return (
    <Notice tone="block" title={title}>
      {problems.length > 1 ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : (
        problems[0]
      )}
    </Notice>
  )
}

/** La fiche d'exigences en vigueur : la validation porte sur elle, sans point à trancher. */
function SheetSummary({ bid }: { bid: Bid }) {
  const sheet = useCurrentSheet(bid.tender, true)
  if (sheet.isPending) return <p className="text-xs text-ink-muted">Lecture de la fiche…</p>
  if (!sheet.data) return <p className="text-[0.8125rem] text-ink-muted">La fiche d'exigences n'est pas encore extraite.</p>
  const open = sheet.data.open_points
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[0.8125rem] text-ink">
        Fiche d'exigences, version <span className="tabular font-bold">{sheet.data.number}</span>
      </span>
      {open ? <ConfidenceTag level="check">{open === 1 ? "1 point à trancher" : `${open} points à trancher`}</ConfidenceTag> : <ConfidenceTag level="ok">Aucun point à trancher</ConfidenceTag>}
      <Button asChild size="sm" variant="outline">
        <Link to={`/avis/${bid.tender}`}>
          Relire la fiche
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  )
}

const WHAT: Record<string, string> = {
  depot: "Déposez l'avis et ses annexes sur la page de l'avis : l'étape se termine dès le premier document.",
  extraction: "La fiche d'exigences est extraite des documents de l'avis. L'étape se termine quand elle est prête.",
  controle_conformite: "Le contrôle de conformité vérifie le dossier monté ; l'étape se termine avec son rapport.",
  choix_contenus: "Le témoin, les experts, les références et les pièces exigées sont choisis pour le dossier.",
  methodologie_planning: "La méthodologie, les activités, les livrables et le planning sont rédigés.",
  calcul_offre: "Les taux, les frais et la règle fiscale donnent l'offre financière.",
  validation_exigences: "Tranchez les points ambigus de la fiche, puis validez-la : votre relecture fait foi.",
  go_no_go: "Décidez de poursuivre, au vu de la fiche et du tableau Go / No-Go ci-dessous.",
  validation_technique: "Relisez les contenus du dossier : une autre personne que leur auteur les valide.",
  prix_final: "Fixez le prix final de l'offre.",
  validation_finale: "Dernière relecture avant l'export du dossier.",
}

/**
 * Étape à faire maintenant : ce qu'elle demande, qui la fait, et ses actions. Une validation
 * renvoie les empreintes reçues avec le parcours : si le contenu a changé entre-temps, le serveur
 * la refuse, et l'écran se relit. Les boutons attendent la fin de chaque relecture du parcours.
 */
export function StepActions({ bid, step, right, canEdit, syncing }: { bid: Bid; step: Step; right: "role" | "delegation" | null; canEdit: boolean; syncing: boolean }) {
  const confirm = useConfirm()
  const validate = useValidateStep(bid.id)
  const reject = useRejectStep(bid.id)
  const complete = useCompleteStep(bid.id)
  const validation = step.kind === "validation"
  // Pendant que le parcours se relit, ses empreintes peuvent être périmées : on attend.
  const busy = validate.isPending || reject.isPending || complete.isPending || syncing
  const headingId = `etape-${step.key}`

  const approve = async () => {
    const go = step.key === GO
    const answer = await confirm({
      title: go ? "Poursuivre ce dossier ?" : `Valider « ${step.label} » ?`,
      description: go
        ? "Le dossier passe au choix des contenus. La décision est enregistrée à votre nom, avec le tableau Go / No-Go tel qu'il est affiché."
        : "La validation est enregistrée à votre nom et le dossier est figé dans cette version. Si le contenu change ensuite, elle sera à refaire.",
      confirmLabel: go ? "Go : poursuivre" : "Valider",
    })
    if (answer) validate.mutate({ step: step.key, seen: step.fingerprints, comment: "" })
  }

  const refuse = async () => {
    const go = step.key === GO
    const answer = await confirm({
      title: go ? "Ne pas poursuivre ce dossier ?" : `Refuser « ${step.label} » ?`,
      description: go
        ? "Le dossier est arrêté et archivé avec ce motif. Cette décision est définitive."
        : "Le travail est renvoyé à l'équipe, avec ce motif. Les étapes déjà faites qui en dépendent sont à refaire.",
      confirmLabel: go ? "No-Go : arrêter le dossier" : "Refuser",
      tone: "danger",
      reason: { label: "Motif", minLength: 5, placeholder: go ? "Délai trop court pour réunir les références exigées…" : "Le critère d'expérience est mal lu…" },
    })
    if (answer) reject.mutate({ step: step.key, comment: answer.reason })
  }

  return (
    <section aria-labelledby={headingId} className="rounded-xl bg-card ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        {validation ? <ValidationGlyph className="size-5 text-blue-700" /> : <ListChecks className="size-5 text-blue-700" aria-hidden="true" />}
        <h3 id={headingId} className="text-sm font-extrabold text-ink">
          {step.label}
        </h3>
        <span className="text-xs text-ink-muted">{performer(step)}</span>
        {step.status === "invalidated" ? <ConfidenceTag level="check">À refaire</ConfidenceTag> : null}
      </div>
      <div className="space-y-3 px-4 py-3">
        {step.invalidated_reason ? (
          <Notice tone="check" title="Cette étape est à refaire">
            {step.invalidated_reason}
          </Notice>
        ) : null}
        <p className="max-w-[72ch] text-[0.8125rem] text-ink-muted">{WHAT[step.key] ?? ""}</p>
        {step.key === REQUIREMENTS || step.key === "depot" || step.key === "extraction" ? <SheetLink bid={bid} step={step} /> : null}

        {validate.isError ? <Problems title="Validation refusée" error={validate.error} /> : null}
        {reject.isError ? <Problems title="Refus non enregistré" error={reject.error} /> : null}
        {complete.isError ? <Problems title="L'étape ne peut pas encore se terminer" error={complete.error} /> : null}

        {validation ? (
          right ? (
            <div className="space-y-2">
              {right === "delegation" ? (
                <p className="text-xs text-ink-muted">Vous décidez par délégation écrite : la décision portera votre nom et celui du titulaire.</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void approve()} disabled={busy}>
                  {validate.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <Check data-icon="inline-start" aria-hidden="true" />}
                  {step.key === GO ? "Go : poursuivre" : "Valider"}
                </Button>
                <Button variant="outline" onClick={() => void refuse()} disabled={busy}>
                  {step.key === GO ? <CircleSlash data-icon="inline-start" aria-hidden="true" /> : <Undo2 data-icon="inline-start" aria-hidden="true" />}
                  {step.key === GO ? "No-Go" : "Refuser"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs font-semibold text-ink">En attente : {performer(step).toLowerCase()}, ou une personne qui a sa délégation écrite.</p>
          )
        ) : AUTOMATIC.includes(step.key) ? null : canEdit ? (
          <Button variant="outline" onClick={() => complete.mutate(step.key)} disabled={busy}>
            {complete.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <Check data-icon="inline-start" aria-hidden="true" />}
            Déclarer l'étape terminée
          </Button>
        ) : (
          <p className="text-xs text-ink-muted">Seuls les membres du dossier et les chefs de pôle font avancer cette étape.</p>
        )}
      </div>
    </section>
  )
}

function SheetLink({ bid, step }: { bid: Bid; step: Step }) {
  if (step.key === REQUIREMENTS) return <SheetSummary bid={bid} />
  return (
    <Button asChild size="sm" variant="outline">
      <Link to={`/avis/${bid.tender}`}>
        Ouvrir l'avis
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Link>
    </Button>
  )
}
