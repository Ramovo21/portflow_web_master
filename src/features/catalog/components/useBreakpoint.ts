import { Grid } from "antd";

export function useBreakpoint(): boolean {
  const screens = Grid.useBreakpoint();
  return screens.lg === false;
}
