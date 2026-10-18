import type { ReactNode } from "react";
import { Col, Row } from "antd";

interface Props {
  main: ReactNode;

  side?: ReactNode;
}

export function DocumentLayout({ main, side }: Props) {
  if (!side) return <>{main}</>;
  return (
    <Row gutter={[16, 16]} align="top">
      <Col xs={{ span: 24, order: 2 }} xl={{ span: 16, order: 1 }}>
        {main}
      </Col>
      <Col xs={{ span: 24, order: 1 }} xl={{ span: 8, order: 2 }}>
        <div className="pf-doc-side">{side}</div>
      </Col>
    </Row>
  );
}
