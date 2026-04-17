import {
  exampleExtension,
  type RegisteredExtension
} from "./exampleExtension.js";

export interface ExtensionExposure {
  id: string;
  name: string;
  version: string;
  description: string;
  status: RegisteredExtension["status"];
  capabilities: string[];
}

export interface ExtensionRegistryDiagnostics {
  loadedCount: number;
  extensionIds: string[];
  limitations: string[];
}

export interface ExtensionRegistry {
  list(): RegisteredExtension[];
  getById(id: string): RegisteredExtension | null;
  getExposure(): {
    count: number;
    extensions: ExtensionExposure[];
  };
  getDiagnostics(): ExtensionRegistryDiagnostics;
}

export function getRegisteredExtensions(): RegisteredExtension[] {
  return [exampleExtension];
}

export function createExtensionRegistry(
  extensions: RegisteredExtension[] = getRegisteredExtensions()
): ExtensionRegistry {
  const loadedExtensions = [...extensions];

  return {
    list() {
      return loadedExtensions;
    },
    getById(id: string) {
      return loadedExtensions.find((extension) => extension.id === id) ?? null;
    },
    getExposure() {
      return {
        count: loadedExtensions.length,
        extensions: loadedExtensions.map((extension) => ({
          id: extension.id,
          name: extension.name,
          version: extension.version,
          description: extension.description,
          status: extension.status,
          capabilities: [...extension.capabilities]
        }))
      };
    },
    getDiagnostics() {
      return {
        loadedCount: loadedExtensions.filter((extension) => extension.status === "loaded").length,
        extensionIds: loadedExtensions.map((extension) => extension.id),
        limitations: loadedExtensions.flatMap((extension) => extension.limitations ?? [])
      };
    }
  };
}
