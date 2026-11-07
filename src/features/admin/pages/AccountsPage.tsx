import { Copy, KeyRound, Loader2, MoreHorizontal, RefreshCw, ShieldOff, UserMinus, UserPlus, UserRoundCog, X } from "lucide-react"
import { useState } from "react"
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form"

import { userMessage } from "@/api"
import { ROLE_LABEL, type Role } from "@/app/roles"
import { useConfirm } from "@/components/confirm"
import { DataTable, Pagination, useListParams, type Column } from "@/components/data"
import { applyServerErrors, Field, FormAlert } from "@/components/forms"
import { Notice } from "@/components/sifec/notice"
import { Page } from "@/components/sifec/page"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSession } from "@/features/auth"

import { provisionalPassword, useChangeRole, useCreateUser, useDeactivate, useResetOtp, useSetPassword, useUsers, type User } from "../api"

const ROLES = Object.entries(ROLE_LABEL) as [Role, string][]
/** Rôles qui valident un code à chaque connexion (synthèse, M11). */
const OTP_ROLES: Role[] = ["chef_departement", "chef_pole", "admin_technique"]

type Secret = { name: string; password: string; created: boolean }

/** Mot de passe provisoire montré une seule fois, à communiquer à la personne. */
function SecretNotice({ secret, onClose }: { secret: Secret; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <Notice
      tone="info"
      title={secret.created ? `Compte de ${secret.name} créé` : `Mot de passe provisoire de ${secret.name}`}
      className="mb-4"
      action={
        <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fermer">
          <X aria-hidden="true" />
        </Button>
      }
    >
      <p>Communiquez ce mot de passe provisoire à la personne, de vive voix ou par un canal séparé. Il ne sera plus affiché.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded-md bg-card px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-ink ring-1 ring-line" aria-label="Mot de passe provisoire">
          {secret.password}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard?.writeText(secret.password).then(() => setCopied(true))
          }}
        >
          <Copy data-icon="inline-start" aria-hidden="true" />
          {copied ? "Copié" : "Copier"}
        </Button>
      </div>
    </Notice>
  )
}

type Values = {
  email: string
  first_name: string
  last_name: string
  role: Role | ""
  password: string
}
const FIELDS = ["email", "first_name", "last_name", "role", "password"]

function NewAccount({ onClose, onCreated }: { onClose: () => void; onCreated: (secret: Secret) => void }) {
  const create = useCreateUser()
  const form = useForm<Values>({
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      role: "",
      password: provisionalPassword(),
    },
  })
  const role = useWatch({ control: form.control, name: "role" })
  return (
    <FormProvider {...form}>
      <form
        noValidate
        aria-label="Nouveau compte"
        className="mb-6 space-y-4 rounded-xl bg-card p-5 ring-1 ring-line"
        onSubmit={form.handleSubmit((values) => {
          if (!values.role) {
            form.setError("role", { message: "Choisissez un rôle." })
            return
          }
          create.mutate(
            {
              email: values.email.trim(),
              first_name: values.first_name.trim(),
              last_name: values.last_name.trim(),
              role: values.role,
              password: values.password,
            },
            {
              onSuccess: () =>
                onCreated({
                  name: `${values.first_name.trim()} ${values.last_name.trim()}`,
                  password: values.password,
                  created: true,
                }),
              onError: (error) => applyServerErrors(error, form.setError, FIELDS),
            },
          )
        })}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-ink">Nouveau compte</h2>
            <p className="mt-1 max-w-[68ch] text-xs text-ink-muted">
              La personne se connecte avec ce mot de passe provisoire. Les chefs et l'administrateur activent ensuite la double authentification à leur première connexion.
            </p>
          </div>
          <Button type="button" size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fermer">
            <X aria-hidden="true" />
          </Button>
        </div>
        <FormAlert />
        <fieldset disabled={create.isPending} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <legend className="sr-only">Identité et rôle</legend>
          <Field name="first_name" label="Prénom" required>
            <Input
              autoComplete="off"
              {...form.register("first_name", {
                required: "Indiquez le prénom.",
              })}
            />
          </Field>
          <Field name="last_name" label="Nom" required>
            <Input autoComplete="off" {...form.register("last_name", { required: "Indiquez le nom." })} />
          </Field>
          <Field name="email" label="Adresse électronique" required>
            <Input type="email" autoComplete="off" {...form.register("email", { required: "Indiquez l'adresse." })} />
          </Field>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Field name="role" label="Rôle" required help={role && OTP_ROLES.includes(role) ? "Ce rôle valide un code à chaque connexion." : undefined}>
                {(a11y) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...a11y} className="w-full">
                      <SelectValue placeholder="Choisir un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            )}
          />
          <Field name="password" label="Mot de passe provisoire" required help="Douze caractères au moins. Proposé au hasard ; vous pouvez le changer.">
            {(a11y) => (
              <div className="flex gap-2">
                <Input
                  {...a11y}
                  className="font-mono"
                  autoComplete="off"
                  {...form.register("password", {
                    required: "Indiquez un mot de passe.",
                    minLength: {
                      value: 12,
                      message: "Douze caractères au moins.",
                    },
                  })}
                />
                <Button type="button" variant="outline" size="icon" aria-label="Proposer un autre mot de passe" onClick={() => form.setValue("password", provisionalPassword())}>
                  <RefreshCw aria-hidden="true" />
                </Button>
              </div>
            )}
          </Field>
        </fieldset>
        <div className="flex justify-end">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <UserPlus data-icon="inline-start" aria-hidden="true" />}
            Créer le compte
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

function RoleDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const change = useChangeRole()
  const [role, setRole] = useState<Role>(user.role)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            change.mutate({ id: user.id, role }, { onSuccess: onClose })
          }}
        >
          <DialogHeader>
            <DialogTitle>Rôle de {user.full_name}</DialogTitle>
            <DialogDescription>Le changement prend effet à la prochaine action de la personne. Il est journalisé.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="role-change">Nouveau rôle</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger id="role-change" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {OTP_ROLES.includes(role) && !OTP_ROLES.includes(user.role) ? (
              <p className="text-xs text-ink-muted">Ce rôle demande la double authentification : elle sera activée à la prochaine connexion.</p>
            ) : null}
            {change.isError ? (
              <p role="alert" className="text-xs font-semibold text-block">
                {userMessage(change.error)}
              </p>
            ) : null}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={change.isPending || role === user.role}>
              Changer le rôle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Comptes et rôles (UC16), réservés à l'administrateur technique : il crée les comptes, change
 * les rôles, donne un mot de passe provisoire, réinitialise la double authentification et
 * désactive. Il ne voit pas le contenu des dossiers.
 */
export function AccountsPage() {
  const { params, update } = useListParams()
  const users = useUsers(params.page)
  const me = useSession().data?.user.id
  const [creating, setCreating] = useState(false)
  const [secret, setSecret] = useState<Secret | null>(null)
  const [editing, setEditing] = useState<User | null>(null)
  const confirm = useConfirm()
  const setPassword = useSetPassword()
  const resetOtp = useResetOtp()
  const deactivate = useDeactivate()
  const failed = [setPassword, resetOtp, deactivate].find((mutation) => mutation.isError)
  const [done, setDone] = useState<string | null>(null)

  async function givePassword(user: User) {
    const ok = await confirm({
      title: `Mot de passe provisoire pour ${user.full_name} ?`,
      description: "L'ancien mot de passe cesse de fonctionner. Le nouveau s'affiche une seule fois, pour être communiqué.",
      confirmLabel: "Donner un mot de passe",
    })
    if (!ok) return
    const password = provisionalPassword()
    setPassword.mutate(
      { id: user.id, password },
      {
        onSuccess: () => setSecret({ name: user.full_name, password, created: false }),
      },
    )
  }

  async function resetTwoFactor(user: User) {
    const ok = await confirm({
      title: `Réinitialiser la double authentification de ${user.full_name} ?`,
      description: "Téléphone perdu ou changé : l'application d'authentification et les codes de secours sont effacés. La personne en configure une nouvelle à sa prochaine connexion.",
      confirmLabel: "Réinitialiser",
      tone: "danger",
    })
    if (ok)
      resetOtp.mutate(user.id, {
        onSuccess: () => setDone(`Double authentification de ${user.full_name} réinitialisée.`),
      })
  }

  async function disable(user: User) {
    const ok = await confirm({
      title: `Désactiver le compte de ${user.full_name} ?`,
      description: "La personne ne peut plus se connecter. Ses fiches, validations et entrées du journal restent, à son nom.",
      confirmLabel: "Désactiver",
      tone: "danger",
    })
    if (ok) deactivate.mutate(user.id)
  }

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Personne",
      wrap: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.full_name || row.email}</div>
          <div className="text-xs text-ink-muted">{row.email}</div>
        </div>
      ),
    },
    { key: "role", header: "Rôle", cell: (row) => ROLE_LABEL[row.role] },
    {
      key: "state",
      header: "État",
      cell: (row) => (row.is_active ? <span className="text-ink">Actif</span> : <span className="text-ink-muted">Désactivé</span>),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        row.is_active ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label={`Actions sur le compte de ${row.full_name}`}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(row)}>
                <UserRoundCog aria-hidden="true" />
                Changer le rôle
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void givePassword(row)}>
                <KeyRound aria-hidden="true" />
                Donner un mot de passe provisoire
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void resetTwoFactor(row)}>
                <ShieldOff aria-hidden="true" />
                Réinitialiser la double authentification
              </DropdownMenuItem>
              {row.id !== me ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => void disable(row)}>
                    <UserMinus aria-hidden="true" />
                    Désactiver le compte
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
    },
  ]

  return (
    <Page>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[68ch]">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-ink">Comptes et rôles</h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-muted">Chaque personne du Cabinet a un compte nominatif. Le rôle décide de ce qu'elle voit et valide ; chaque changement est journalisé.</p>
        </div>
        {creating ? null : (
          <Button onClick={() => setCreating(true)}>
            <UserPlus data-icon="inline-start" aria-hidden="true" />
            Nouveau compte
          </Button>
        )}
      </header>
      {secret ? <SecretNotice secret={secret} onClose={() => setSecret(null)} /> : null}
      {done ? (
        <Notice
          tone="info"
          title={done}
          className="mb-4"
          action={
            <Button size="icon-sm" variant="ghost" onClick={() => setDone(null)} aria-label="Fermer">
              <X aria-hidden="true" />
            </Button>
          }
        />
      ) : null}
      {failed ? (
        <Notice tone="block" title="Action refusée" className="mb-4">
          {userMessage(failed.error)}
        </Notice>
      ) : null}
      {creating ? (
        <NewAccount
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setCreating(false)
            setSecret(created)
          }}
        />
      ) : null}
      <DataTable
        caption="Comptes"
        columns={columns}
        rows={users.data?.results}
        rowKey={(row) => row.id}
        loading={users.isFetching}
        error={users.error}
        onRetry={() => void users.refetch()}
        empty={{ title: "Aucun compte", hint: "Créez le premier compte." }}
      />
      {users.data ? <Pagination page={params.page} count={users.data.count} onPage={(page) => update({ page })} /> : null}
      {editing ? <RoleDialog user={editing} onClose={() => setEditing(null)} /> : null}
    </Page>
  )
}
