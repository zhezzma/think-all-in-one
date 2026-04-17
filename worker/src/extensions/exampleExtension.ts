export interface RegisteredExtension {
  id: string;
  name: string;
  version: string;
  description: string;
  status: "loaded" | "disabled";
  capabilities: string[];
  limitations?: string[];
}

export const exampleExtension: RegisteredExtension = {
  id: "example-extension",
  name: "Example Extension",
  version: "0.1.0",
  description:
    "Demonstrates a pragmatic extension registration surface for the Think scaffold.",
  status: "loaded",
  capabilities: ["registry", "diagnostics"],
  limitations: [
    "This scaffold currently exposes extensions through a static registry surface instead of dynamic runtime plugin loading."
  ]
};
