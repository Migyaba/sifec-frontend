import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, useForm } from "react-hook-form"
import { describe, expect, it } from "vitest"

import { ApiError, NetworkError } from "@/api"
import { Input } from "@/components/ui/input"

import { applyServerErrors, Field, FormAlert } from "."

function ExpertForm({ failure }: { failure: unknown }) {
  const form = useForm({ defaultValues: { name: "", ifu: "" } })
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(() => {
          applyServerErrors(failure, form.setError, ["name", "ifu"])
        })}
      >
        <FormAlert />
        <Field name="name" label="Nom" required>
          <Input {...form.register("name")} />
        </Field>
        <Field name="ifu" label="IFU" help="13 chiffres.">
          <Input {...form.register("ifu")} />
        </Field>
        <button type="submit">Enregistrer</button>
      </form>
    </FormProvider>
  )
}

describe("erreurs de l'API dans un formulaire", () => {
  it("rattache chaque message à son champ, et le reste en tête", async () => {
    const failure = new ApiError(400, "invalid", "Non valide.", {
      ifu: ["L'IFU compte 13 chiffres."],
      employer: ["Employeur inconnu."],
      non_field_errors: ["La fiche est verrouillée."],
    })
    render(<ExpertForm failure={failure} />)

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    const ifu = screen.getByLabelText("IFU")
    expect(ifu).toHaveAttribute("aria-invalid", "true")
    expect(ifu).toHaveAccessibleDescription("L'IFU compte 13 chiffres. 13 chiffres.")
    expect(screen.getByRole("alert")).toHaveTextContent("employer : Employeur inconnu. La fiche est verrouillée.")
    expect(screen.getByLabelText(/Nom/)).not.toHaveAttribute("aria-invalid")
  })

  it("dit en tête qu'une coupure n'a rien perdu", async () => {
    render(<ExpertForm failure={new NetworkError()} />)

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(screen.getByRole("alert")).toHaveTextContent("rien n'a été perdu")
  })
})
