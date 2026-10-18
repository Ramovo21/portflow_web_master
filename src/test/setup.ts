import "@testing-library/jest-dom/vitest";

const VIEWPORT_WIDTH = 1280;

function matchesViewport(query: string): boolean {
  const min = /min-width:\s*(\d+)px/.exec(query);
  const max = /max-width:\s*(\d+)px/.exec(query);
  return (!min || VIEWPORT_WIDTH >= Number(min[1])) && (!max || VIEWPORT_WIDTH <= Number(max[1]));
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: matchesViewport(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { configure } from "@testing-library/react";

configure({ asyncUtilTimeout: 10_000 });
