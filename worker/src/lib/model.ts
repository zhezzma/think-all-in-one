import { createWorkersAI } from "workers-ai-provider";

export type WorkerBindings = {
  AI: unknown;
};

const DEFAULT_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

export function getDefaultModel(env: WorkerBindings, model = DEFAULT_MODEL) {
  return createWorkersAI({ binding: env.AI as never })(model);
}
