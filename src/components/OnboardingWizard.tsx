import { useCallback, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { renderOnboardingStepPreview } from "@/components/onboarding/OnboardingFeaturePreviews";
import { FeatureCarousel } from "@/components/ui/feature-carousel";
import { BrandLogoInline } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ONBOARDING_STEPS } from "@/lib/onboarding-steps";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { dismissOnboardingFlow } from "@/lib/onboarding-events";

const TOTAL = ONBOARDING_STEPS.length;

const ONBOARDING_CTA =
  "min-h-[44px] !bg-[#111a4a] !text-white hover:!bg-[#023247] focus-visible:!ring-[#111a4a]/30";

interface OnboardingWizardProps {
  onComplete: () => void;
}

function headerTitle(step: number): string {
  if (step === 0) return `Get started with ${BRAND_NAME}`;
  return ONBOARDING_STEPS[step]?.title ?? "";
}

function headerSubtitle(step: number): string {
  if (step === 0) return BRAND_TAGLINE;
  return `Step ${step + 1} of ${TOTAL}`;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const isLast = step >= TOTAL - 1;

  const finish = useCallback(() => {
    dismissOnboardingFlow();
    onComplete();
  }, [onComplete]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) finish();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[95vh] w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-mist px-6 py-4">
          <div className="min-w-0">
            <BrandLogoInline className="mb-3" />
            <DialogTitle className="type-heading-sm text-deep-ink">{headerTitle(step)}</DialogTitle>
            <DialogDescription className="mt-1">{headerSubtitle(step)}</DialogDescription>
          </div>
          <button
            type="button"
            onClick={finish}
            className="app-control-icon inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-carbon hover:bg-paper-white"
            aria-label={isLast ? "Close onboarding" : "Skip onboarding"}
          >
            <XMarkIcon className="h-5 w-5" aria-hidden />
            <span className="sr-only">{isLast ? "Close" : "Skip"}</span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-paper-white p-4 md:p-6">
          <FeatureCarousel
            title={BRAND_NAME}
            description="Local RAG on your desktop"
            steps={ONBOARDING_STEPS}
            currentStep={step}
            onStepChange={setStep}
            renderStepPreview={renderOnboardingStepPreview}
            clickToAdvance={false}
            allowFutureSteps
          />
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-mist bg-card-white px-6 py-4">
          {step > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="min-h-[44px]"
            >
              Back
            </Button>
          ) : (
            <div className="min-h-[44px] w-[72px] shrink-0" aria-hidden />
          )}
          <p className="text-center text-body-sm text-slate" aria-live="polite">
            {isLast ? (
              "You're ready to start."
            ) : (
              <>
                <span className="md:hidden">Tap Continue or pick a step above.</span>
                <span className="hidden md:inline">Use Continue or jump to any step above.</span>
              </>
            )}
          </p>
          {isLast ? (
            <Button type="button" onClick={finish} className={ONBOARDING_CTA}>
              Get started
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setStep((s) => Math.min(TOTAL - 1, s + 1))}
              className={ONBOARDING_CTA}
            >
              Continue
            </Button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
