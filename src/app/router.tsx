import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";

import { AppLayout } from "@/app/layout/AppLayout";
import { RootLayout } from "@/app/layout/RootLayout";
import { NotFoundPage } from "@/pages/NotFoundPage";
import {
  AccountPage,
  AuthCallbackPage,
  LoginPage,
  RequireAuth,
  RequirePermission,
} from "@/features/auth";
import { PageSpinner } from "@/shared/components/page/PageSpinner";

function lazyPage(loader: () => Promise<object>, name: string) {
  const Page = lazy(async () => {
    const module = (await loader()) as Record<string, ComponentType>;
    return { default: module[name] };
  });
  return (
    <Suspense fallback={<PageSpinner />}>
      <Page />
    </Suspense>
  );
}

const inbox = () => import("@/features/inbox");
const customers = () => import("@/features/customers");
const contracts = () => import("@/features/contracts");
const review = () => import("@/features/review");
const pricing = () => import("@/features/pricing");
const catalog = () => import("@/features/catalog");
const volume = () => import("@/features/volume");
const billing = () => import("@/features/billing");
const audit = () => import("@/features/audit");
const delegation = () => import("@/features/delegation");
const admin = () => import("@/features/admin");

function guarded(anyOf: string[], element: ReactNode) {
  return <RequirePermission anyOf={anyOf}>{element}</RequirePermission>;
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/auth/callback", element: <AuthCallbackPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "/",
            element: <AppLayout />,
            children: [
              { index: true, element: lazyPage(inbox, "InboxPage") },
              { path: "account", element: <AccountPage /> },
              {
                path: "delegations",
                element: guarded(["Delegation.Manage"], lazyPage(delegation, "DelegationPage")),
              },
              {
                path: "customers",
                children: [
                  {
                    index: true,
                    element: guarded(["Customer.Read"], lazyPage(customers, "CustomerListPage")),
                  },
                  {
                    path: ":id",
                    element: guarded(["Customer.Read"], lazyPage(customers, "CustomerDetailPage")),
                  },
                ],
              },
              {
                path: "contracts",
                children: [
                  {
                    index: true,
                    element: guarded(["Contract.Read"], lazyPage(contracts, "ContractListPage")),
                  },
                  {
                    path: "new",
                    element: guarded(
                      ["Contract.Create"],
                      lazyPage(contracts, "CreateContractPage"),
                    ),
                  },
                  {
                    path: ":id",
                    element: guarded(["Contract.Read"], lazyPage(contracts, "ContractDetailPage")),
                  },
                  {
                    path: ":id/edit",
                    element: guarded(["Contract.Update"], lazyPage(contracts, "EditContractPage")),
                  },
                ],
              },
              {
                path: "addenda/:id",
                element: guarded(["Contract.Read"], lazyPage(contracts, "AddendumDetailPage")),
              },
              { path: "review/:documentType/:documentId", element: lazyPage(review, "ReviewPage") },
              {
                path: "pricing",
                children: [
                  {
                    index: true,
                    element: guarded(["PriceList.Read"], lazyPage(pricing, "PriceListPage")),
                  },
                  {
                    path: "new",
                    element: guarded(
                      ["PriceList.Create"],
                      lazyPage(pricing, "CreatePriceListPage"),
                    ),
                  },
                  {
                    path: "resolve",
                    element: guarded(["PriceList.Read"], lazyPage(pricing, "PriceResolvePage")),
                  },
                  {
                    path: ":id",
                    element: guarded(["PriceList.Read"], lazyPage(pricing, "PriceListDetailPage")),
                  },
                ],
              },
              {
                path: "catalog",
                element: guarded(
                  ["PriceList.Read", "ServiceCatalog.Manage"],
                  lazyPage(catalog, "CatalogPage"),
                ),
              },
              {
                path: "volume",
                element: guarded(["Volume.Read"], lazyPage(volume, "VolumePeriodPage")),
              },
              {
                path: "billing",
                children: [
                  {
                    index: true,
                    element: guarded(
                      ["PaymentSheet.Read"],
                      lazyPage(billing, "PaymentSheetListPage"),
                    ),
                  },
                  {
                    path: ":id",
                    element: guarded(
                      ["PaymentSheet.Read"],
                      lazyPage(billing, "PaymentSheetDetailPage"),
                    ),
                  },
                ],
              },
              {
                path: "audit/:documentType/:documentId",
                element: guarded(
                  ["Audit.Read", "Audit.ReadAll"],
                  lazyPage(audit, "AuditTimelinePage"),
                ),
              },
              {
                path: "admin",
                children: [
                  { index: true, element: <Navigate to="users" replace /> },
                  {
                    path: "users",
                    element: guarded(["User.Admin"], lazyPage(admin, "UserManagementPage")),
                  },
                  {
                    path: "departments",
                    element: guarded(["User.Admin"], lazyPage(admin, "DepartmentPage")),
                  },
                  { path: "roles", element: guarded(["Role.Admin"], lazyPage(admin, "RolePage")) },
                  {
                    path: "document-types",
                    element: guarded(["DocumentType.Admin"], lazyPage(admin, "DocumentTypePage")),
                  },
                  {
                    path: "workflows",
                    element: guarded(["Workflow.Admin"], lazyPage(admin, "WorkflowDesignerPage")),
                  },
                  {
                    path: "workflows/:id",
                    element: guarded(["Workflow.Admin"], lazyPage(admin, "WorkflowDefinitionPage")),
                  },
                  {
                    path: "outbox",
                    element: guarded(["System.Admin"], lazyPage(admin, "OutboxPage")),
                  },
                ],
              },
              { path: "404", element: <NotFoundPage /> },
              { path: "*", element: <Navigate to="/404" replace /> },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
