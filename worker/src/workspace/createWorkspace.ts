import { Workspace, type WorkspaceOptions } from "@cloudflare/shell";

export interface WorkspaceFactoryOptions {
  sql: WorkspaceOptions["sql"];
  name?: WorkspaceOptions["name"];
  r2?: WorkspaceOptions["r2"];
  r2Prefix?: string;
  inlineThreshold?: number;
  namespace?: string;
  onChange?: WorkspaceOptions["onChange"];
}

export function createWorkspace(options: WorkspaceFactoryOptions): Workspace {
  return new Workspace({
    sql: options.sql,
    name: options.name,
    namespace: options.namespace,
    onChange: options.onChange,
    ...(options.r2
      ? {
          r2: options.r2,
          r2Prefix: options.r2Prefix,
          inlineThreshold: options.inlineThreshold
        }
      : {})
  });
}
