import { Check } from "lucide-react"
import { Link } from "react-router"

import { userMessage } from "@/api"
import { useConfirm } from "@/components/confirm"
import { DataTable, Pagination, useListParams, type Column } from "@/components/data"
import { ConfidenceTag } from "@/components/sifec/confidence"
import { Notice } from "@/components/sifec/notice"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { LEVEL_LABEL, LEVEL_TONE, objectLink, STATUS_LABEL, useAlerts, useTreatAlert, type Alert } from "../api"

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" })

function Filter({ label, value, options, onChange, all }: { label: string; value: string; options: Record<string, string>; onChange: (value: string | null) => void; all: string }) {
  return (
    <Select value={value || "tous"} onValueChange={(next) => onChange(next === "tous" ? null : next)}>
      <SelectTrigger className="w-[min(14rem,100%)]" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="tous">{all}</SelectItem>
        {Object.entries(options).map(([key, text]) => (
          <SelectItem key={key} value={key}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Alertes (UC15) : pièces qui expirent, CV anciens, conflits d'experts, validations en attente.
 * Une alerte se ferme seule quand son constat disparaît ; la traiter dit qu'une personne s'en
 * occupe, avec un commentaire journalisé. Elle se rouvre au seuil suivant.
 */
export function AlertsPage() {
  const { params, query, update } = useListParams(["status", "level"])
  const status = params.filters.status ?? "open"
  const alerts = useAlerts({ ...query, status })
  const treat = useTreatAlert()
  const confirm = useConfirm()

  const columns: Column<Alert>[] = [
    { key: "level", header: "Urgence", cell: (row) => <ConfidenceTag level={LEVEL_TONE[row.level]}>{LEVEL_LABEL[row.level]}</ConfidenceTag> },
    {
      key: "title",
      header: "Alerte",
      wrap: true,
      cell: (row) => {
        const link = objectLink(row.object_type, row.object_id)
        return (
          <div className="min-w-[16rem]">
            {link ? (
              <Link to={link} className="font-semibold text-ink hover:text-blue-700 hover:underline">
                {row.title}
              </Link>
            ) : (
              <span className="font-semibold text-ink">{row.title}</span>
            )}
            {row.message ? <div className="text-xs text-ink-muted">{row.message}</div> : null}
            {row.treatment_comment ? <div className="mt-0.5 text-xs text-ink-muted">Traitement : {row.treatment_comment}</div> : null}
          </div>
        )
      },
    },
    { key: "since", header: "Depuis le", secondary: true, cell: (row) => <span className="text-ink-muted">{when.format(new Date(row.created_at))}</span> },
    {
      key: "action",
      header: "",
      align: "right",
      cell: (row) =>
        row.status === "open" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={treat.isPending}
            onClick={async () => {
              const answer = await confirm({
                title: "Traiter cette alerte ?",
                description: "Elle reste visible, marquée traitée, et se rouvrira au seuil suivant si son constat demeure.",
                confirmLabel: "Marquer traitée",
                reason: { label: "Ce qui est fait", minLength: 5, placeholder: "Renouvellement demandé à la DGI le 7 novembre…" },
              })
              if (answer) treat.mutate({ id: row.id, comment: answer.reason })
            }}
          >
            <Check data-icon="inline-start" aria-hidden="true" />
            Traiter
          </Button>
        ) : (
          <span className="text-xs text-ink-muted">{STATUS_LABEL[row.status]}</span>
        ),
    },
  ]

  return (
    <Page>
      <header className="mb-6 max-w-[68ch]">
        <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Alertes</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
          Ce qui demande une action avant qu'un dossier ne soit bloqué. Une alerte se ferme d'elle-même quand son constat disparaît, par exemple quand la pièce renouvelée est validée.
        </p>
      </header>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(next) => update({ filters: { status: next === "open" ? null : next } })}>
          <SelectTrigger className="w-[min(14rem,100%)]" aria-label="État des alertes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABEL).map(([key, text]) => (
              <SelectItem key={key} value={key}>
                {text}s
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Filter label="Urgence" value={params.filters.level ?? ""} options={LEVEL_LABEL} onChange={(level) => update({ filters: { level } })} all="Toutes les urgences" />
      </div>
      {treat.isError ? (
        <div className="mb-3">
          <Notice tone="block" title="Traitement refusé">
            {userMessage(treat.error)}
          </Notice>
        </div>
      ) : null}
      <DataTable
        caption="Alertes"
        columns={columns}
        rows={alerts.data?.results}
        rowKey={(row) => row.id}
        loading={alerts.isFetching}
        error={alerts.error}
        onRetry={() => void alerts.refetch()}
        empty={{
          title: status === "open" ? "Aucune alerte ouverte" : "Aucune alerte dans cet état",
          hint: status === "open" ? "Les alertes sont recalculées chaque jour à 7 h, et à chaque publication d'une pièce ou d'un expert." : "Choisissez un autre état.",
        }}
      />
      {alerts.data ? <Pagination page={params.page} count={alerts.data.count} onPage={(page) => update({ page })} /> : null}
    </Page>
  )
}
