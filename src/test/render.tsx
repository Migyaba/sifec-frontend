import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router"

import { AppRoutes } from "@/App"
import { ConfirmProvider } from "@/components/confirm"

export function renderApp(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <ConfirmProvider>
            <AppRoutes />
          </ConfirmProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}
