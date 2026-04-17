import { Think } from "@cloudflare/think";

import { getDefaultModel } from "../../lib/model.js";
import type { Env } from "../../index.js";

export class OpsSubAgent extends Think<Env> {
  declare readonly env: Env;

  getModel() {
    return getDefaultModel(this.env);
  }

  override getSystemPrompt() {
    return [
      "You are the operations specialist for the Think all-in-one assistant.",
      "Help with execution planning, checklists, runbooks, and incident-oriented reasoning.",
      "Stay concrete and implementation-minded."
    ].join(" ");
  }
}
