import { Think, type Session } from "@cloudflare/think";

import { getDefaultModel } from "../../lib/model.js";
import type { Env } from "../../index.js";

export class MemorySubAgent extends Think<Env> {
  declare readonly env: Env;

  getModel() {
    return getDefaultModel(this.env);
  }

  override getSystemPrompt() {
    return [
      "You are the memory specialist for the Think all-in-one assistant.",
      "Capture durable facts, preferences, and reusable summaries from conversations.",
      "Prefer structured, low-noise memory updates."
    ].join(" ");
  }

  override configureSession(session: Session) {
    return session.withContext("memory", {
      description: "Important user facts and durable conversation context.",
      maxTokens: 1200
    });
  }
}
