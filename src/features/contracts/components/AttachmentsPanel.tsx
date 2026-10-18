import { App, Button, List, Typography, Upload } from "antd";
import {
  ClockCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  InboxOutlined,
  LockOutlined,
} from "@ant-design/icons";

import { RelativeTime } from "@/shared/components/data/DateText";
import { errorMessage } from "@/shared/lib/problem";

import type { AttachmentRef } from "../api/contracts";
import { fetchDownloadUrl, uploadAttachment } from "../api/lookups";

const MAX_SIZE = 20 * 1024 * 1024;
const ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg";

interface Props {
  entityType: "CONTRACT" | "ADDENDUM";
  entityId: string | undefined;
  attachments: AttachmentRef[];
  canUpload: boolean;
  /** Files picked before the entity exists; uploaded by the owner once it is saved. */
  pendingFiles?: File[];

  onUploaded?(attachment: AttachmentRef): void;
  onPendingChange?(files: File[]): void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function AttachmentsPanel({
  entityType,
  entityId,
  attachments,
  canUpload,
  pendingFiles = [],
  onUploaded,
  onPendingChange,
}: Props) {
  const { message } = App.useApp();

  const download = async (attachment: AttachmentRef) => {
    try {
      const { url } = await fetchDownloadUrl(attachment.id);
      window.open(url, "_blank", "noopener");
    } catch (error) {
      message.error(errorMessage(error));
    }
  };

  const queueLocally = !entityId && !!onPendingChange;

  return (
    <>
      {canUpload && (entityId || queueLocally) && (
        <Upload.Dragger
          accept={ACCEPT}
          multiple
          showUploadList={false}
          style={{ marginBottom: 16 }}
          beforeUpload={(file, fileList) => {
            // beforeUpload runs once per selected file; queue the whole selection on the first call.
            if (queueLocally && file === fileList[0]) {
              onPendingChange?.([
                ...pendingFiles,
                ...fileList.filter((item) => item.size <= MAX_SIZE),
              ]);
            }
            if (file.size > MAX_SIZE) {
              message.error(`${file.name}: file exceeds 20 MB.`);
              return Upload.LIST_IGNORE;
            }
            return queueLocally ? Upload.LIST_IGNORE : true;
          }}
          customRequest={async ({ file, onSuccess, onError }) => {
            if (!entityId) return;
            try {
              const result = await uploadAttachment(
                entityType,
                entityId,
                file as File,
                crypto.randomUUID(),
              );
              message.success(`Uploaded ${result.fileName}`);
              onSuccess?.(result);
              onUploaded?.(result);
            } catch (error) {
              message.error(`${(file as File).name}: ${errorMessage(error)}`);
              onError?.(error as Error);
            }
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Kéo thả hoặc bấm để chọn tệp</p>
          <p className="ant-upload-hint">PDF, DOCX, PNG, JPG – tối đa 20 MB mỗi tệp</p>
        </Upload.Dragger>
      )}
      {canUpload && !entityId && !queueLocally && (
        <Typography.Paragraph type="secondary">Lưu nháp để đính kèm tệp.</Typography.Paragraph>
      )}
      {pendingFiles.length > 0 && (
        <List
          size="small"
          style={{ marginBottom: 8 }}
          dataSource={pendingFiles}
          renderItem={(file, index) => (
            <List.Item
              actions={[
                <Button
                  key="remove"
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onPendingChange?.(pendingFiles.filter((_, i) => i !== index))}
                  aria-label={`Bỏ ${file.name}`}
                />,
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    <ClockCircleOutlined title="Sẽ tải lên khi lưu" /> {file.name}
                  </span>
                }
                description={`${formatSize(file.size)} · sẽ tải lên khi lưu`}
              />
            </List.Item>
          )}
        />
      )}
      <List
        size="small"
        dataSource={attachments}
        locale={{ emptyText: pendingFiles.length > 0 ? " " : "No attachments yet." }}
        renderItem={(attachment) => (
          <List.Item
            actions={[
              <Button
                key="download"
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => void download(attachment)}
                aria-label={`Tải ${attachment.fileName}`}
              />,
            ]}
          >
            <List.Item.Meta
              title={
                <span>
                  {attachment.locked && <LockOutlined title="Đã khóa sau khi duyệt" />}{" "}
                  {attachment.fileName}
                </span>
              }
              description={
                <>
                  {formatSize(attachment.size)} · <RelativeTime value={attachment.uploadedAt} />
                </>
              }
            />
          </List.Item>
        )}
      />
    </>
  );
}
