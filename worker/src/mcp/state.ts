export interface McpSurfaceConfig {
  enabled: boolean;
  transport: "surface-only";
  configuredServers: Array<{
    id: string;
    name: string;
    status: "configured" | "disabled";
    transport: "surface-only";
  }>;
}

export interface McpDiagnostics {
  serverCount: number;
  enabledServerCount: number;
  limitations: string[];
}

export interface McpState {
  getSurface(): {
    status: "available" | "disabled";
    config: McpSurfaceConfig;
  };
  getDiagnostics(): McpDiagnostics;
}

export function createMcpState(
  config: Partial<McpSurfaceConfig> = {}
): McpState {
  const normalizedConfig: McpSurfaceConfig = {
    enabled: config.enabled ?? false,
    transport: "surface-only",
    configuredServers: config.configuredServers ?? []
  };

  return {
    getSurface() {
      return {
        status: normalizedConfig.enabled ? "available" : "disabled",
        config: normalizedConfig
      };
    },
    getDiagnostics() {
      return {
        serverCount: normalizedConfig.configuredServers.length,
        enabledServerCount: normalizedConfig.configuredServers.filter(
          (server) => server.status === "configured"
        ).length,
        limitations: [
          "This scaffold currently exposes inspectable MCP status/configuration state, but it does not attach live MCP transports or remote servers yet."
        ]
      };
    }
  };
}
