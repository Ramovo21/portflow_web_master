import { useEffect } from "react";
import { App } from "antd";
import { useBlocker } from "react-router-dom";

export function useUnsavedChangesGuard(dirty: boolean) {
  const { modal } = App.useApp();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    modal.confirm({
      title: "Bỏ thay đổi chưa lưu?",
      content: "Những gì bạn vừa nhập sẽ mất.",
      okText: "Bỏ thay đổi",
      okButtonProps: { danger: true },
      cancelText: "Ở lại",
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    });
  }, [blocker, modal]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
