import { useState } from "react";
import { App, Button, Tooltip } from "antd";
import { FilePdfOutlined } from "@ant-design/icons";

const REVOKE_AFTER_MS = 60_000;

interface Props {
  load: () => Promise<Blob>;
  draft: boolean;
}

export function PdfPreviewButton({ load, draft }: Props) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const open = async () => {
    const popup = window.open("", "_blank");
    setLoading(true);
    try {
      const blob = await load();
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      if (popup) popup.location.href = url;
      else window.location.assign(url);
      window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
    } catch {
      popup?.close();
      message.error("Không tạo được file PDF. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title={draft ? "Bản dự thảo – có đóng dấu DỰ THẢO, chưa dùng để ký" : undefined}>
      <Button icon={<FilePdfOutlined />} loading={loading} onClick={open}>
        Xem PDF
      </Button>
    </Tooltip>
  );
}
