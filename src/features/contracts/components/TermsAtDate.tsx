import { useState } from "react";
import { DatePicker, Descriptions, Empty, Flex, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import { Link } from "react-router-dom";

import { formatDate } from "@/shared/lib/format";
import { statusOf } from "@/shared/lib/problem";

import type { ContractResponse } from "../api/contracts";
import { useTermsAt } from "../hooks/useContracts";
import { paymentMethodLabel } from "../lib/labels";

const HAS_TERMS = ["APPROVED", "ACTIVE", "EXPIRED", "CANCELLED"];

export function TermsAtDate({
  contract,
  initialDate,
}: {
  contract: ContractResponse;
  initialDate?: string;
}) {
  const [at, setAt] = useState(initialDate ?? dayjs().format("YYYY-MM-DD"));
  const approved = HAS_TERMS.includes(contract.status) && !!contract.approvedAt;
  const terms = useTermsAt(contract.id, at, approved);

  return (
    <>
      <Flex gap={8} align="center" style={{ marginBottom: 16 }}>
        <Typography.Text>Xem tại ngày</Typography.Text>
        <DatePicker
          aria-label="Xem tại ngày"
          format="DD/MM/YYYY"
          allowClear={false}
          value={dayjs(at)}
          onChange={(value) => value && setAt(value.format("YYYY-MM-DD"))}
        />
      </Flex>
      {!approved ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Terms take effect once the contract is approved."
        />
      ) : terms.isLoading ? (
        <Skeleton active />
      ) : terms.isError ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            statusOf(terms.error) === 404
              ? `No terms in effect on ${formatDate(at)} (before the start date).`
              : "Could not load terms."
          }
        />
      ) : terms.data ? (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Nguồn">
            {terms.data.sourceAddendumId ? (
              <Link to={`/addenda/${terms.data.sourceAddendumId}`}>
                Phụ lục, từ {formatDate(terms.data.validFrom)}
              </Link>
            ) : (
              `Gốc, từ ${formatDate(terms.data.validFrom)}`
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Hiệu lực đến">
            {formatDate(terms.data.effectiveTo)}
          </Descriptions.Item>
          <Descriptions.Item label="Thanh toán">
            {terms.data.paymentDays} ngày · {paymentMethodLabel(terms.data.paymentMethod)}
            {terms.data.paymentNote && <div>{terms.data.paymentNote}</div>}
          </Descriptions.Item>
          <Descriptions.Item label="Điều khoản dịch vụ">
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {terms.data.serviceTerms || "—"}
            </Typography.Paragraph>
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </>
  );
}
