import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/App";
import { SILENT_CALLBACK_PATH, userManager } from "@/features/auth";
import "@/shared/styles/global.css";

if (window.location.pathname === SILENT_CALLBACK_PATH) {
  void userManager.signinCallback().catch(() => undefined);
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
