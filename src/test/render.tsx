import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { App as AntApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import type { Me } from "@/features/auth";
import { createSession, SessionContext } from "@/features/auth/session";

import { meFixture } from "./fixtures";

interface Options {
  me?: Me;

  route?: string;

  path?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { me = meFixture(), route = "/", path = "*" }: Options = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path, element: ui },
      { path: "*", element: <div>other route</div> },
    ],
    {
      initialEntries: [route],
    },
  );
  const result = render(
    <ConfigProvider locale={viVN}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <SessionContext.Provider value={createSession(me)}>
            <RouterProvider router={router} />
          </SessionContext.Provider>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>,
  );
  return { ...result, router, queryClient };
}
