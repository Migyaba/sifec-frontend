import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { afterEach } from "vitest"

// Les écrans sont chargés à la demande : le premier chargement d'un module dépasse parfois la
// seconde d'attente par défaut quand la machine est occupée.
configure({ asyncUtilTimeout: 3000 })

afterEach(() => cleanup())
