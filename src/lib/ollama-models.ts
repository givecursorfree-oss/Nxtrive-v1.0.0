import { BRAND_NAME } from "@/lib/brand";

export interface ModelInfo {
  label: string;
  purpose: string;
}

export const MODEL_INFO: Record<string, ModelInfo> = {
  llama3: {
    label: "Llama 3",
    purpose: "Powers chat answers",
  },
  "nomic-embed-text": {
    label: "Nomic Embed Text",
    purpose: "Indexes and searches your documents",
  },
};

export function getModelInfo(model: string): ModelInfo {
  return (
    MODEL_INFO[model] ?? {
      label: model,
      purpose: `Required for ${BRAND_NAME}`,
    }
  );
}

export function getModelLibraryUrl(model: string): string {
  return `https://ollama.com/library/${encodeURIComponent(model)}`;
}

export function buildPullCommand(models: string[]): string {
  return models.map((model) => `ollama pull ${model}`).join("\n");
}

export function buildPullScript(models: string[]): string {
  return models.map((model) => `ollama pull ${model}`).join(" && ");
}

export function isModelInstalled(model: string, installed: string[]): boolean {
  return installed.some((name) => name === model || name.startsWith(`${model}:`));
}
