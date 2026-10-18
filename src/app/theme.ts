import type { ThemeConfig } from "antd";

export const BRAND_COLOR = "#0B4F8A";

export const theme: ThemeConfig = {
  token: {
    colorPrimary: BRAND_COLOR,
    colorInfo: BRAND_COLOR,
    borderRadius: 8,
    fontFamily:
      "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    colorBgLayout: "#F4F6F9",
  },
  components: {
    Layout: { headerHeight: 56, headerPadding: "0 16px", siderBg: "#FFFFFF", headerBg: "#FFFFFF" },
    Menu: { itemBorderRadius: 6, itemMarginInline: 8, activeBarBorderWidth: 0 },
  },
};
