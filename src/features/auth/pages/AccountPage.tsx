import { Alert, Card, Col, Descriptions, Flex, Row, Tag, Typography } from "antd";
import dayjs from "dayjs";

import { PageHeader } from "@/shared/components/page/PageHeader";

import { dataScopeLabel, documentTypeLabel, roleLabel } from "../labels";
import { accountConsoleUrl } from "../oidc";
import { useSession } from "../session";

function groupPermissions(permissions: string[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const permission of [...permissions].sort()) {
    const [resource, action] = permission.split(".");
    groups.set(resource!, [...(groups.get(resource!) ?? []), action ?? permission]);
  }
  return [...groups.entries()];
}

export function AccountPage() {
  const { me } = useSession();

  return (
    <>
      <PageHeader
        title="Thông tin tài khoản"
        subtitle="Thông tin lấy từ Keycloak; muốn thay đổi vai trò hoặc phòng ban, liên hệ Quản trị."
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Hồ sơ">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Họ tên">{me.fullName}</Descriptions.Item>
              <Descriptions.Item label="Tên đăng nhập">{me.username}</Descriptions.Item>
              <Descriptions.Item label="Phòng ban">
                {me.department ? `${me.department.name} (${me.department.code})` : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Vai trò">
                <Flex wrap gap={4}>
                  {me.roles.map((role) => (
                    <Tag key={role} color="blue">
                      {roleLabel(role)}
                    </Tag>
                  ))}
                </Flex>
              </Descriptions.Item>
              <Descriptions.Item label="Phạm vi dữ liệu">
                {dataScopeLabel(me.dataScope)}
              </Descriptions.Item>
              <Descriptions.Item label="Mật khẩu">
                <Typography.Link href={accountConsoleUrl} target="_blank" rel="noopener">
                  Đổi mật khẩu ↗
                </Typography.Link>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Đang thay mặt" style={{ marginTop: 16 }}>
            {me.actingFor.length === 0 ? (
              <Typography.Text type="secondary">
                Không nhận ủy quyền nào đang hiệu lực.
              </Typography.Text>
            ) : (
              <Flex vertical gap={8}>
                {me.actingFor.map((delegation) => (
                  <Alert
                    key={delegation.userId}
                    type="info"
                    title={`${delegation.fullName ?? delegation.userId} – đến ${dayjs(delegation.validTo).format("DD/MM/YYYY")}`}
                    description={
                      delegation.documentTypes.length === 0
                        ? "Mọi loại hồ sơ"
                        : delegation.documentTypes.map(documentTypeLabel).join(", ")
                    }
                  />
                ))}
              </Flex>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title={`Quyền (${me.permissions.length})`}>
            <Descriptions column={1} size="small" bordered>
              {groupPermissions(me.permissions).map(([resource, actions]) => (
                <Descriptions.Item key={resource} label={resource}>
                  <Flex wrap gap={4}>
                    {actions.map((action) => (
                      <Tag key={action}>{action}</Tag>
                    ))}
                  </Flex>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </>
  );
}
