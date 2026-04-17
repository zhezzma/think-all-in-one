import { useEffect, useRef, useState } from "react";

export type ClientToolLifecycle = "registered" | "ready" | "running" | "succeeded" | "failed";

export type ClientToolDefinition = {
  id: string;
  name: string;
  description: string;
  category: "browser" | "storage" | "diagnostics";
  run: () => unknown | Promise<unknown>;
};

export type ClientToolEntry = {
  id: string;
  name: string;
  description: string;
  category: ClientToolDefinition["category"];
  lifecycle: ClientToolLifecycle;
  registeredAt: string;
  lastRunAt: string | null;
  runCount: number;
  lastResult?: unknown;
  lastError?: string;
};

export type ClientToolRegistry = ReturnType<typeof createClientToolRegistry>;

export function createClientToolRegistry(definitions: ClientToolDefinition[]) {
  let entries: ClientToolEntry[] = definitions.map((definition) => ({
    id: definition.id,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    lifecycle: "registered",
    registeredAt: new Date().toISOString(),
    lastRunAt: null,
    runCount: 0
  }));

  const listeners = new Set<(nextEntries: ClientToolEntry[]) => void>();

  const emit = () => {
    const snapshot = getEntries();
    listeners.forEach((listener) => listener(snapshot));
  };

  const updateEntry = (
    id: string,
    updater: (entry: ClientToolEntry) => ClientToolEntry
  ) => {
    entries = entries.map((entry) => (entry.id === id ? updater(entry) : entry));
    emit();
  };

  function getEntries() {
    return entries.map((entry) => ({ ...entry }));
  }

  function subscribe(listener: (nextEntries: ClientToolEntry[]) => void) {
    listeners.add(listener);
    listener(getEntries());
    return () => {
      listeners.delete(listener);
    };
  }

  function markReady() {
    entries = entries.map((entry) =>
      entry.lifecycle === "registered" ? { ...entry, lifecycle: "ready" } : entry
    );
    emit();
  }

  async function invoke(id: string) {
    const definition = definitions.find((tool) => tool.id === id);
    if (!definition) {
      return null;
    }

    updateEntry(id, (entry) => ({
      ...entry,
      lifecycle: "running",
      lastRunAt: new Date().toISOString(),
      runCount: entry.runCount + 1,
      lastError: undefined
    }));

    try {
      const result = await definition.run();
      updateEntry(id, (entry) => ({
        ...entry,
        lifecycle: "succeeded",
        lastResult: result,
        lastError: undefined
      }));
    } catch (error) {
      updateEntry(id, (entry) => ({
        ...entry,
        lifecycle: "failed",
        lastError: error instanceof Error ? error.message : "Unknown client tool failure"
      }));
    }

    return getEntries().find((entry) => entry.id === id) ?? null;
  }

  async function invokeAll() {
    for (const definition of definitions) {
      await invoke(definition.id);
    }
  }

  return {
    getEntries,
    subscribe,
    markReady,
    invoke,
    invokeAll
  };
}

export function createBrowserClientTools(
  browser: Pick<Window, "location" | "localStorage" | "navigator" | "document" | "performance"> = window
): ClientToolDefinition[] {
  return [
    {
      id: "browser-environment",
      name: "Browser environment",
      description: "Captures the current location, visibility state, and user agent.",
      category: "browser",
      run: () => ({
        href: browser.location.href,
        origin: browser.location.origin,
        pathname: browser.location.pathname,
        hash: browser.location.hash,
        visibilityState: browser.document.visibilityState,
        userAgent: browser.navigator.userAgent
      })
    },
    {
      id: "local-storage-summary",
      name: "Local storage summary",
      description: "Enumerates browser localStorage keys available to the app.",
      category: "storage",
      run: () => {
        const keys = Array.from({ length: browser.localStorage.length }, (_, index) =>
          browser.localStorage.key(index)
        ).filter((value): value is string => Boolean(value));

        return {
          available: true,
          keyCount: keys.length,
          keys
        };
      }
    },
    {
      id: "clipboard-capability",
      name: "Clipboard capability",
      description: "Reports whether clipboard APIs are exposed in the current browser.",
      category: "browser",
      run: () => ({
        hasClipboardApi: Boolean(browser.navigator.clipboard),
        canReadText: typeof browser.navigator.clipboard?.readText === "function",
        canWriteText: typeof browser.navigator.clipboard?.writeText === "function"
      })
    },
    {
      id: "timing-snapshot",
      name: "Timing snapshot",
      description: "Records a lightweight performance timestamp for the current render session.",
      category: "diagnostics",
      run: () => ({
        now: browser.performance.now(),
        timestamp: new Date().toISOString()
      })
    }
  ];
}

let sharedRegistry: ClientToolRegistry | null = null;
let sharedBootstrapComplete = false;

function getSharedRegistry() {
  if (!sharedRegistry) {
    sharedRegistry = createClientToolRegistry(createBrowserClientTools());
  }

  return sharedRegistry;
}

export function resetClientToolRegistryForTests() {
  sharedRegistry = null;
  sharedBootstrapComplete = false;
}

export function useClientToolRegistry() {
  const registryRef = useRef(getSharedRegistry());
  const [entries, setEntries] = useState<ClientToolEntry[]>(registryRef.current.getEntries());

  useEffect(() => registryRef.current.subscribe(setEntries), []);

  useEffect(() => {
    if (sharedBootstrapComplete) {
      return;
    }

    sharedBootstrapComplete = true;
    registryRef.current.markReady();
    void registryRef.current.invokeAll();
  }, []);

  return {
    entries,
    rerunTool: (id: string) => registryRef.current.invoke(id),
    rerunAll: () => registryRef.current.invokeAll()
  };
}
