import { describe, expect, it } from "vitest";

import { createExtensionRegistry } from "../src/extensions/registry.js";
import { createMcpState } from "../src/mcp/state.js";
import { createDiagnosticsTool } from "../src/tools/server/diagnostics.js";

describe("integration surfaces", () => {
  it("loads the example extension through the registry exposure surface and supports enablement-aware cataloging", () => {
    const registry = createExtensionRegistry();

    expect(registry.getExposure()).toEqual({
      count: 1,
      extensions: [
        {
          id: "example-extension",
          name: "Example Extension",
          version: "0.1.0",
          description:
            "Demonstrates a pragmatic extension registration surface for the Think scaffold.",
          status: "loaded",
          capabilities: ["registry", "diagnostics"],
          enabled: true
        }
      ]
    });

    expect(registry.getCatalog([])).toEqual({
      count: 1,
      extensions: [
        {
          id: "example-extension",
          name: "Example Extension",
          version: "0.1.0",
          description:
            "Demonstrates a pragmatic extension registration surface for the Think scaffold.",
          status: "loaded",
          capabilities: ["registry", "diagnostics"],
          enabled: false,
          limitations: [
            "This scaffold currently exposes extensions through a static registry surface instead of dynamic runtime plugin loading."
          ]
        }
      ]
    });

    expect(registry.getExposure([])).toEqual({
      count: 0,
      extensions: []
    });

    expect(registry.getDiagnostics([])).toEqual({
      availableCount: 1,
      enabledCount: 0,
      loadedCount: 0,
      extensionIds: ["example-extension"],
      enabledExtensionIds: [],
      disabledExtensionIds: ["example-extension"],
      limitations: []
    });

    expect(registry.getDiagnostics()).toEqual({
      availableCount: 1,
      enabledCount: 1,
      loadedCount: 1,
      extensionIds: ["example-extension"],
      enabledExtensionIds: ["example-extension"],
      disabledExtensionIds: [],
      limitations: [
        "This scaffold currently exposes extensions through a static registry surface instead of dynamic runtime plugin loading."
      ]
    });
  });

  it("exposes MCP status/config and reports diagnostics through the diagnostics tool", async () => {
    const registry = createExtensionRegistry();
    const mcpState = createMcpState({
      enabled: true,
      configuredServers: [
        {
          id: "local-docs",
          name: "Local Docs",
          status: "configured",
          transport: "surface-only"
        }
      ]
    });

    const diagnosticsTool = createDiagnosticsTool({
      workspace: {
        getWorkspaceInfo: async () => ({
          fileCount: 5,
          directoryCount: 3,
          totalBytes: 4096,
          r2FileCount: 0
        })
      },
      getConfig: () => ({ model: "test-model", enabledExtensions: ["example-extension"] }),
      getSurfaces: () => ({
        extensions: registry.getExposure(["example-extension"]),
        mcp: mcpState.getSurface()
      }),
      getDiagnostics: () => ({
        extensions: registry.getDiagnostics(["example-extension"]),
        mcp: mcpState.getDiagnostics()
      })
    });

    const result = await diagnosticsTool.execute?.(
      { includePaths: false },
      { toolCallId: "integration-1", messages: [] }
    );

    expect(result).toMatchObject({
      ok: true,
      config: { model: "test-model", enabledExtensions: ["example-extension"] },
      surfaces: {
        extensions: {
          count: 1,
          extensions: [
            expect.objectContaining({
              id: "example-extension",
              status: "loaded",
              enabled: true
            })
          ]
        },
        mcp: {
          status: "available",
          config: {
            enabled: true,
            transport: "surface-only",
            configuredServers: [
              {
                id: "local-docs",
                name: "Local Docs",
                status: "configured",
                transport: "surface-only"
              }
            ]
          }
        }
      },
      diagnostics: {
        extensions: {
          availableCount: 1,
          enabledCount: 1,
          loadedCount: 1,
          extensionIds: ["example-extension"],
          enabledExtensionIds: ["example-extension"]
        },
        mcp: {
          serverCount: 1,
          enabledServerCount: 1,
          limitations: [
            "This scaffold currently exposes inspectable MCP status/configuration state, but it does not attach live MCP transports or remote servers yet."
          ]
        }
      }
    });
  });
});
