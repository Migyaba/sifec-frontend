import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useState } from "react"
import { Navigate } from "react-router"

import { ApiError, fieldErrors } from "@/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { authMessage, useLogin } from "../api"
import { AuthLayout } from "../components/AuthLayout"
import { FormError } from "../components/FormError"
import { useGate } from "../useGate"

export function LoginPage() {
  const { session, gate, target, from } = useGate()
  const login = useLogin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [visible, setVisible] = useState(false)

  if (gate && gate !== "login" && target) return <Navigate to={target} replace state={{ from }} />

  const fields = login.error instanceof ApiError && login.error.code === "invalid" ? fieldErrors(login.error.details) : {}
  const general = Object.keys(fields).length ? null : authMessage(login.error)

  return (
    <AuthLayout title="Connexion" intro="Avec l'adresse et le mot de passe de votre compte au Cabinet.">
      {session.isPending && !session.isFetched ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Vérification de la session
        </div>
      ) : (
        <form
          className="space-y-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            login.mutate({ email: email.trim(), password })
          }}
        >
          <FormError message={general} />
          <div className="space-y-1.5">
            <Label htmlFor="email">Adresse électronique</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={fields.email ? true : undefined}
              aria-describedby={fields.email ? "email-error" : undefined}
            />
            {fields.email ? (
              <p id="email-error" className="text-xs font-semibold text-block">
                {fields.email.join(" ")}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-10"
                aria-invalid={fields.password ? true : undefined}
              />
              <button
                type="button"
                onClick={() => setVisible((shown) => !shown)}
                className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-muted hover:text-ink"
                aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-pressed={visible}
              >
                {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
            {fields.password ? <p className="text-xs font-semibold text-block">{fields.password.join(" ")}</p> : null}
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={login.isPending || !email || !password}>
            {login.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
            {login.isPending ? "Connexion en cours" : "Se connecter"}
          </Button>
          <p className="text-xs text-ink-muted">
            Mot de passe oublié : demandez à l'administrateur technique de réinitialiser votre accès.
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
