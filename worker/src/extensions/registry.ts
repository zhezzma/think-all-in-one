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
  enabled: boolean;
}

export interface ExtensionCatalogEntry extends ExtensionExposure {
  limitations: string[];
}

export interface ExtensionRegistryDiagnostics {
  availableCount: number;
  enabledCount: number;
  loadedCount: number;
  extensionIds: string[];
  enabledExtensionIds: string[];
  disabledExtensionIds: string[];
  limitations: string[];
}

export interface ExtensionRegistry {
  list(): RegisteredExtension[];
  listAvailable(): RegisteredExtension[];
  listEnabled(enabledExtensionIds?: string[]): RegisteredExtension[];
  getById(id: string): RegisteredExtension | null;
  getExposure(enabledExtensionIds?: string[]): {
    count: number;
    extensions: ExtensionExposure[];
  };
  getCatalog(enabledExtensionIds?: string[]): {
    count: number;
    extensions: ExtensionCatalogEntry[];
  };
  getDiagnostics(enabledExtensionIds?: string[]): ExtensionRegistryDiagnostics;
}

export function getRegisteredExtensions(): RegisteredExtension[] {
  return [exampleExtension];
}

export function createExtensionRegistry(
  extensions: RegisteredExtension[] = getRegisteredExtensions()
): ExtensionRegistry {
  const availableExtensions = [...extensions];

  function normalizeEnabledIds(enabledExtensionIds?: string[]): string[] | null {
    if (!enabledExtensionIds) {
      return null;
    }

    return [...new Set(enabledExtensionIds)].sort((left, right) => left.localeCompare(right));
  }

  function isEnabled(extension: RegisteredExtension, enabledIds: string[] | null) {
    return enabledIds === null ? extension.status !== "disabled" : enabledIds.includes(extension.id);
  }

  function toExposure(extension: RegisteredExtension, enabledIds: string[] | null): ExtensionExposure {
    return {
      id: extension.id,
      name: extension.name,
      version: extension.version,
      description: extension.description,
      status: extension.status,
      capabilities: [...extension.capabilities],
      enabled: isEnabled(extension, enabledIds)
    };
  }

  return {
    list() {
      return availableExtensions;
    },
    listAvailable() {
      return availableExtensions;
    },
    listEnabled(enabledExtensionIds) {
      const enabledIds = normalizeEnabledIds(enabledExtensionIds);
      return availableExtensions.filter((extension) => isEnabled(extension, enabledIds));
    },
    getById(id) {
      return availableExtensions.find((extension) => extension.id === id) ?? null;
    },
    getExposure(enabledExtensionIds) {
      const enabledIds = normalizeEnabledIds(enabledExtensionIds);
      const extensions = availableExtensions
        .map((extension) => toExposure(extension, enabledIds))
        .filter((extension) => extension.enabled);

      return {
        count: extensions.length,
        extensions
      };
    },
    getCatalog(enabledExtensionIds) {
      const enabledIds = normalizeEnabledIds(enabledExtensionIds);
      return {
        count: availableExtensions.length,
        extensions: availableExtensions.map((extension) => ({
          ...toExposure(extension, enabledIds),
          limitations: [...(extension.limitations ?? [])]
        }))
      };
    },
    getDiagnostics(enabledExtensionIds) {
      const enabledIds = normalizeEnabledIds(enabledExtensionIds);
      const enabled = availableExtensions.filter((extension) => isEnabled(extension, enabledIds));
      return {
        availableCount: availableExtensions.length,
        enabledCount: enabled.length,
        loadedCount: enabled.filter((extension) => extension.status === "loaded").length,
        extensionIds: availableExtensions.map((extension) => extension.id),
        enabledExtensionIds: enabled.map((extension) => extension.id),
        disabledExtensionIds: availableExtensions
          .filter((extension) => !isEnabled(extension, enabledIds))
          .map((extension) => extension.id),
        limitations: enabled.flatMap((extension) => extension.limitations ?? [])
      };
    }
  };
}
