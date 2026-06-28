import { setOnboardingDone } from "./storage";

export const ONBOARDING_DISMISSED_EVENT = "nxtrive:onboarding-dismissed";

/** Persist skip/close and notify all onboarding surfaces to unmount. */
export function dismissOnboardingFlow(): void {
  setOnboardingDone();
  window.dispatchEvent(new CustomEvent(ONBOARDING_DISMISSED_EVENT));
}
