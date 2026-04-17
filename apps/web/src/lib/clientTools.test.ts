import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createElement, StrictMode } from "react";
import {
  createClientToolRegistry,
  resetClientToolRegistryForTests,
  useClientToolRegistry
} from "./clientTools";

beforeEach(() => {
  resetClientToolRegistryForTests();
});

describe("client tool registry", () => {
  it("registers tools, marks them ready, and records successful runs", async () => {
    const registry = createClientToolRegistry([
      {
        id: "demo-tool",
        name: "Demo tool",
        description: "test helper",
        category: "diagnostics",
        run: async () => ({ ok: true })
      }
    ]);

    expect(registry.getEntries()).toMatchObject([
      {
        id: "demo-tool",
        lifecycle: "registered",
        runCount: 0
      }
    ]);

    registry.markReady();
    expect(registry.getEntries()[0]?.lifecycle).toBe("ready");

    await registry.invoke("demo-tool");

    expect(registry.getEntries()).toMatchObject([
      {
        id: "demo-tool",
        lifecycle: "succeeded",
        runCount: 1,
        lastResult: { ok: true }
      }
    ]);
  });

  it("bootstraps browser tools only once across StrictMode remounts", async () => {
    function HookHarness() {
      const { entries } = useClientToolRegistry();
      return createElement(
        "div",
        null,
        ...entries.map((entry) =>
          createElement("div", { key: entry.id }, `${entry.id}:${entry.runCount}`)
        )
      );
    }

    render(createElement(StrictMode, null, createElement(HookHarness)));

    await waitFor(() => {
      expect(screen.getByText("browser-environment:1")).toBeInTheDocument();
      expect(screen.getByText("local-storage-summary:1")).toBeInTheDocument();
      expect(screen.getByText("clipboard-capability:1")).toBeInTheDocument();
      expect(screen.getByText("timing-snapshot:1")).toBeInTheDocument();
    });
  });
});
