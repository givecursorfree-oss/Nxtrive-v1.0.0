import type { OllamaStatus } from "./api";
import { getModelInfo, isModelInstalled } from "./ollama-models";

/** Shown in the setup roadmap before the backend reports required models. */
export const DEFAULT_REQUIRED_MODELS = ["llama3", "nomic-embed-text"] as const;

export type PrerequisiteStatus = "ready" | "missing" | "working" | "waiting";

export interface PrerequisiteItem {
  id: string;
  label: string;
  detail: string;
  status: PrerequisiteStatus;
  actionLabel?: string;
}

function appendModelRoadmap(
  items: PrerequisiteItem[],
  models: readonly string[],
  ollamaStatus: OllamaStatus | null,
  options?: {
    modelsWorking?: boolean;
    workingModel?: string | null;
  },
) {
  const installedModels = ollamaStatus?.models ?? [];

  for (const model of models) {
    const info = getModelInfo(model);
    const installed = ollamaStatus ? isModelInstalled(model, installedModels) : false;
    const isWorking =
      options?.modelsWorking &&
      (options.workingModel === model || options.workingModel === null);

    items.push({
      id: `model-${model}`,
      label: info.label,
      detail: ollamaStatus
        ? info.purpose
        : "Waiting for local service — then we can verify this model",
      status: !ollamaStatus
        ? "waiting"
        : installed
          ? "ready"
          : isWorking
            ? "working"
            : "missing",
      actionLabel: ollamaStatus && !installed ? "Download" : undefined,
    });
  }
}

export function buildPrerequisites(
  backendOnline: boolean,
  ollamaStatus: OllamaStatus | null,
  options?: {
    backendWorking?: boolean;
    modelsWorking?: boolean;
    workingModel?: string | null;
  },
): PrerequisiteItem[] {
  const items: PrerequisiteItem[] = [
    {
      id: "backend",
      label: "App service",
      detail: backendOnline ? "Running locally" : "Starting the local service…",
      status: backendOnline
        ? "ready"
        : options?.backendWorking
          ? "working"
          : "waiting",
    },
  ];

  if (!backendOnline) {
    items.push({
      id: "ollama",
      label: "Ollama",
      detail: "Checked automatically once the app service is online",
      status: "waiting",
    });
    appendModelRoadmap(items, DEFAULT_REQUIRED_MODELS, null, options);
    return items;
  }

  if (!ollamaStatus) {
    items.push({
      id: "ollama",
      label: "Ollama",
      detail: "Checking installation…",
      status: "working",
    });
    appendModelRoadmap(items, DEFAULT_REQUIRED_MODELS, null, options);
    return items;
  }

  if (!ollamaStatus.installed) {
    items.push({
      id: "ollama",
      label: "Ollama",
      detail: "Required to run AI models on your machine",
      status: "missing",
      actionLabel: "Download Ollama",
    });
  } else if (!ollamaStatus.running) {
    items.push({
      id: "ollama",
      label: "Ollama",
      detail: "Installed — waiting for it to start",
      status: options?.backendWorking ? "working" : "waiting",
      actionLabel: "Start Ollama",
    });
  } else {
    items.push({
      id: "ollama",
      label: "Ollama",
      detail: "Installed and running",
      status: "ready",
    });
  }

  if (!ollamaStatus.running) {
    appendModelRoadmap(
      items,
      ollamaStatus.required_models.length > 0
        ? ollamaStatus.required_models
        : DEFAULT_REQUIRED_MODELS,
      ollamaStatus,
      options,
    );
    return items;
  }

  appendModelRoadmap(
    items,
    ollamaStatus.required_models.length > 0
      ? ollamaStatus.required_models
      : DEFAULT_REQUIRED_MODELS,
    ollamaStatus,
    options,
  );

  return items;
}

export function prerequisitesMet(items: PrerequisiteItem[]): boolean {
  return items.length > 0 && items.every((item) => item.status === "ready");
}

export function missingPrerequisiteCount(items: PrerequisiteItem[]): number {
  return items.filter((item) => item.status === "missing").length;
}
