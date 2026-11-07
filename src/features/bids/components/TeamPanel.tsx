import { Building2, Loader2, UserPlus, X } from "lucide-react"
import { useState } from "react"

import type { SessionUser } from "@/app/roles"
import { useConfirm } from "@/components/confirm"
import { Notice } from "@/components/sifec/notice"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { OrganizationName, OrganizationPicker } from "@/features/records"

import { useAddMember, useAddPartner, useMembers, usePartners, useRemoveMember, type MemberRole, type PartnerRole } from "../api"
import { fullName, MEMBER_ROLE, PARTNER_ROLE } from "../labels"
import { problemsOf } from "../messages"

function Heading({ id, title }: { id: string; title: string }) {
  return (
    <h2 id={id} className="border-b border-line px-4 py-3 text-sm font-extrabold text-ink">
      {title}
    </h2>
  )
}

function AddMember({ bidId, candidates, onClose }: { bidId: string; candidates: SessionUser[]; onClose: () => void }) {
  const add = useAddMember(bidId)
  const [user, setUser] = useState("")
  const [role, setRole] = useState<MemberRole>("contributor")
  return (
    <form
      noValidate
      aria-label="Ajouter un membre"
      className="space-y-2 border-t border-line px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (user) add.mutate({ user, role }, { onSuccess: onClose })
      }}
    >
      <Select value={user} onValueChange={setUser}>
        <SelectTrigger className="w-full" aria-label="Personne">
          <SelectValue placeholder="Choisir une personne" />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((candidate) => (
            <SelectItem key={candidate.id} value={candidate.id}>
              {fullName(candidate)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={role} onValueChange={(next) => setRole(next as MemberRole)}>
        <SelectTrigger className="w-full" aria-label="Rôle dans le dossier">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(MEMBER_ROLE) as MemberRole[]).map((key) => (
            <SelectItem key={key} value={key}>
              {MEMBER_ROLE[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {add.isError ? <p className="text-xs font-semibold text-block">{problemsOf(add.error).join(" ")}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={!user || add.isPending}>
          {add.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
          Ajouter
        </Button>
      </div>
    </form>
  )
}

/**
 * Membres du dossier : un collaborateur ne voit que les dossiers dont il est membre. Les chefs
 * de pôle et de département les voient tous, sans en être membres.
 */
export function MembersPanel({ bidId, users, editable }: { bidId: string; users: SessionUser[] | undefined; editable: boolean }) {
  const members = useMembers(bidId)
  const remove = useRemoveMember(bidId)
  const confirm = useConfirm()
  const [adding, setAdding] = useState(false)
  const byId = new Map((users ?? []).map((user) => [user.id, user]))
  const taken = new Set(members.data?.map((member) => member.user))
  const candidates = (users ?? []).filter((user) => user.is_active && user.role !== "admin_technique" && !taken.has(user.id))

  return (
    <section aria-labelledby="membres" className="rounded-xl bg-card ring-1 ring-line">
      <Heading id="membres" title="Équipe du dossier" />
      {members.isPending ? (
        <Skeleton className="m-4 h-4 w-[60%]" />
      ) : members.isError ? (
        <p className="px-4 py-3 text-xs text-block">{problemsOf(members.error).join(" ")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {members.data.map((member) => {
            const user = byId.get(member.user)
            const name = user ? fullName(user) : "…"
            return (
              <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.8125rem] font-semibold text-ink">{name}</div>
                  <div className="text-xs text-ink-muted">{MEMBER_ROLE[member.role]}</div>
                </div>
                {editable ? (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Retirer ${name} du dossier`}
                    disabled={remove.isPending}
                    onClick={async () => {
                      const answer = await confirm({
                        title: `Retirer ${name} du dossier ?`,
                        description: "Un collaborateur retiré ne voit plus le dossier. Le journal garde la trace de ce retrait.",
                        confirmLabel: "Retirer",
                        tone: "danger",
                      })
                      if (answer) remove.mutate(member.id)
                    }}
                  >
                    <X aria-hidden="true" />
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      {remove.isError ? <p className="px-4 pb-3 text-xs font-semibold text-block">{problemsOf(remove.error).join(" ")}</p> : null}
      {editable ? (
        adding ? (
          <AddMember bidId={bidId} candidates={candidates} onClose={() => setAdding(false)} />
        ) : (
          <div className="border-t border-line px-4 py-2.5">
            <Button size="sm" variant="ghost" className="-ml-2" onClick={() => setAdding(true)}>
              <UserPlus data-icon="inline-start" aria-hidden="true" />
              Ajouter un membre
            </Button>
          </div>
        )
      ) : null}
    </section>
  )
}

function AddPartner({ bidId, onClose }: { bidId: string; onClose: () => void }) {
  const add = useAddPartner(bidId)
  const [organization, setOrganization] = useState("")
  const [role, setRole] = useState<PartnerRole>("member")
  return (
    <form
      noValidate
      aria-label="Ajouter un partenaire"
      className="space-y-2 border-t border-line px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (organization) add.mutate({ organization, role }, { onSuccess: onClose })
      }}
    >
      <OrganizationPicker value={organization} onChange={setOrganization} entity label="Partenaire" />
      <Select value={role} onValueChange={(next) => setRole(next as PartnerRole)}>
        <SelectTrigger className="w-full" aria-label="Rôle du partenaire">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PARTNER_ROLE) as PartnerRole[]).map((key) => (
            <SelectItem key={key} value={key}>
              {PARTNER_ROLE[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {add.isError ? <p className="text-xs font-semibold text-block">{problemsOf(add.error).join(" ")}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={!organization || add.isPending}>
          {add.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
          Ajouter
        </Button>
      </div>
    </form>
  )
}

/** Groupement : les partenaires qui répondent avec le titulaire, membres ou sous-traitants. */
export function PartnersPanel({ bidId, leadEntity, editable }: { bidId: string; leadEntity: string; editable: boolean }) {
  const partners = usePartners(bidId)
  const [adding, setAdding] = useState(false)
  return (
    <section aria-labelledby="groupement" className="rounded-xl bg-card ring-1 ring-line">
      <Heading id="groupement" title="Groupement" />
      <ul className="divide-y divide-line">
        <li className="flex items-center gap-3 px-4 py-2.5">
          <Building2 className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.8125rem] font-semibold text-ink">{leadEntity}</div>
            <div className="text-xs text-ink-muted">Titulaire du dossier</div>
          </div>
        </li>
        {partners.data?.map((partner) => (
          <li key={partner.id} className="flex items-center gap-3 px-4 py-2.5">
            <Building2 className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.8125rem] font-semibold text-ink">
                <OrganizationName id={partner.organization} />
              </div>
              <div className="text-xs text-ink-muted">{PARTNER_ROLE[partner.role]}</div>
            </div>
          </li>
        ))}
      </ul>
      {partners.isError ? (
        <div className="px-4 pb-3">
          <Notice tone="block" title="Groupement indisponible">
            {problemsOf(partners.error).join(" ")}
          </Notice>
        </div>
      ) : null}
      {editable ? (
        adding ? (
          <AddPartner bidId={bidId} onClose={() => setAdding(false)} />
        ) : (
          <div className="border-t border-line px-4 py-2.5">
            <Button size="sm" variant="ghost" className="-ml-2" onClick={() => setAdding(true)}>
              <Building2 data-icon="inline-start" aria-hidden="true" />
              Ajouter un partenaire
            </Button>
          </div>
        )
      ) : null}
    </section>
  )
}
