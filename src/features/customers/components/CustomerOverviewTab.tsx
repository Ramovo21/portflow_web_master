import { Alert, Card, Col, Empty, List, Row, Skeleton, Statistic, Tag, Typography } from "antd";
import { Link } from "react-router-dom";

import { DateRangeText } from "@/shared/components/data/DateText";
import { MoneyText } from "@/shared/components/data/MoneyText";
import { StatusTag } from "@/shared/components/status/StatusTag";
import { errorMessage } from "@/shared/lib/problem";
import { statusLabel } from "@/shared/lib/statusLabels";

import type { OverviewWarning } from "../api/customers";
import { useCustomerOverview } from "../hooks/useCustomers";
import { warningText } from "../lib/overviewWarnings";

const SECTION_LABELS: Record<string, string> = {
  contracts: "Hợp đồng",
  priceLists: "Bảng giá",
};

const KPI_STATUSES = ["ACTIVE", "UNDER_REVIEW", "DRAFT", "EXPIRED"];

function warningLink(warning: OverviewWarning): string | null {
  if (warning.documentType === "CONTRACT") return `/contracts/${warning.documentId}`;
  if (warning.documentType === "PRICE_LIST") return `/pricing/${warning.documentId}`;
  return null;
}

export function CustomerOverviewTab({ customerId }: { customerId: string }) {
  const query = useCustomerOverview(customerId);
  if (query.isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (query.isError || !query.data)
    return <Typography.Text type="danger">{errorMessage(query.error)}</Typography.Text>;

  const { sections, warnings, unavailable } = query.data;
  const contracts = sections.contracts;
  const priceLists = sections.priceLists;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {unavailable.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`Tạm thời không tải được: ${unavailable.map((s) => SECTION_LABELS[s] ?? s).join(", ")}`}
        />
      )}

      {warnings.length > 0 && (
        <Card size="small" title={`Cần chú ý (${warnings.length})`}>
          <List
            size="small"
            dataSource={warnings}
            renderItem={(warning) => {
              const link = warningLink(warning);
              const text = warningText(warning);
              return (
                <List.Item>
                  <Tag color={warning.daysLeft <= 7 ? "red" : "orange"}>
                    {warning.daysLeft <= 0 ? "Hôm nay" : `${warning.daysLeft} ngày`}
                  </Tag>
                  {link ? <Link to={link}>{text}</Link> : text}
                </List.Item>
              );
            }}
          />
        </Card>
      )}

      {contracts && (
        <Row gutter={[12, 12]}>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic title="Tổng hợp đồng" value={contracts.total} />
            </Card>
          </Col>
          {KPI_STATUSES.map((status) => (
            <Col xs={12} md={5} key={status}>
              <Card size="small">
                <Statistic
                  title={statusLabel("CONTRACT", status)}
                  value={contracts.byStatus[status] ?? 0}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Row gutter={[16, 16]}>
        {contracts && (
          <Col xs={24} lg={14}>
            <Card size="small" title="Hợp đồng gần đây">
              <List
                size="small"
                dataSource={contracts.items}
                locale={{
                  emptyText: (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hợp đồng." />
                  ),
                }}
                renderItem={(contract) => (
                  <List.Item extra={<StatusTag kind="CONTRACT" status={contract.status} />}>
                    <List.Item.Meta
                      title={<Link to={`/contracts/${contract.id}`}>{contract.number}</Link>}
                      description={
                        <>
                          <DateRangeText from={contract.effectiveFrom} to={contract.effectiveTo} />
                          {contract.value != null && (
                            <>
                              {" · "}
                              <MoneyText
                                short
                                value={contract.value}
                                currency={contract.currency}
                              />
                            </>
                          )}
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}
        {priceLists && (
          <Col xs={24} lg={10}>
            <Card size="small" title="Bảng giá đang hiệu lực">
              <List
                size="small"
                dataSource={priceLists.effective}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Không có bảng giá riêng – áp dụng bảng giá chung."
                    />
                  ),
                }}
                renderItem={(list) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Link to={`/pricing/${list.id}`}>
                          {list.code} · v{list.listVersion}
                        </Link>
                      }
                      description={
                        <>
                          {list.serviceType} ·{" "}
                          <DateRangeText from={list.validFrom} to={list.validTo} />
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}
        <Col xs={24}>
          <Card size="small" title="Công nợ & thanh toán">
            <Typography.Text type="secondary">
              Sẽ hiển thị khi phân hệ bảng kê thanh toán (F07) được triển khai.
            </Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
