import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { AuthProvider } from "react-oidc-context";

import { theme } from "@/app/theme";
import { setupAuth, userManager } from "@/features/auth";
import { queryClient } from "@/shared/lib/queryClient";

dayjs.locale("vi");
setupAuth();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider userManager={userManager} skipSigninCallback>
      <ConfigProvider locale={viVN} theme={theme}>
        <AntApp>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </AntApp>
      </ConfigProvider>
    </AuthProvider>
  );
}
