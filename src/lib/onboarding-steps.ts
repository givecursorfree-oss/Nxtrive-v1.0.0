/** Onboarding content — domain data, independent of UI framework. */

import { BRAND_NAME } from "./brand";

export interface OnboardingImageSet {
  step1light1: string;
  step1light2: string;
  step2light1: string;
  step2light2: string;
  step3light: string;
  step4light: string;
  alt: string;
}

export interface OnboardingStep {
  id: string;
  name: string;
  title: string;
  description: string;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "1",
    name: "Welcome",
    title: "Your documents stay on your machine",
    description:
      `${BRAND_NAME} runs entirely offline. No cloud uploads, no account required — just local AI on your desktop.`,
  },
  {
    id: "2",
    name: "Add documents",
    title: "Choose a folder to index",
    description:
      "Pick a folder or drag it onto the window. PDFs, Word files, code, and markdown are supported.",
  },
  {
    id: "3",
    name: "Index",
    title: "Build your private knowledge base",
    description:
      "Documents are chunked and embedded locally. Progress is shown while files are indexed.",
  },
  {
    id: "4",
    name: "Chat",
    title: "Ask questions, get cited answers",
    description:
      "Chat with your collection. Answers stream in real time and cite the source files they came from.",
  },
] as const;
