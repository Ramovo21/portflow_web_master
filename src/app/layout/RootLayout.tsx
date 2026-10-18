import { Outlet } from "react-router-dom";

import { SessionExpiredModal } from "@/features/auth";

export function RootLayout() {
  return (
    <>
      <Outlet />
      <SessionExpiredModal />
    </>
  );
}
