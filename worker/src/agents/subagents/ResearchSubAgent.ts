import { Think } from "@cloudflare/think";

import { getDefaultModel } from "../../lib/model.js";
import type { Env } from "../../index.js";

export class ResearchSubAgent extends Think<Env> {
  declare readonly env: Env;

  getModel() {
    return getDefaultModel(this.env);
  }

  override getSystemPrompt() {
    return [
      "You are the research specialist for the Think all-in-one assistant.",
      "Focus on collecting facts, clarifying unknowns, and returning concise findings.",
      "Do not claim to have executed real-world actions."
    ].join(" ");
  }
}
