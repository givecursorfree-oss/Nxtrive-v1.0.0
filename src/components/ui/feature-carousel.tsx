import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  type MotionStyle,
  type MotionValue,
  type Variants,
} from "motion/react";
import Balancer from "react-wrap-balancer";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { OnboardingImageSet, OnboardingStep } from "@/lib/onboarding-steps";

type WrapperStyle = MotionStyle & {
  "--x": MotionValue<string>;
  "--y": MotionValue<string>;
};

interface CardProps {
  title: string;
  description: string;
  bgClass?: string;
}

export interface FeatureCarouselProps extends CardProps {
  steps: readonly OnboardingStep[];
  currentStep: number;
  onStepChange: (index: number) => void;
  autoAdvance?: boolean;
  autoAdvanceMs?: number;
  clickToAdvance?: boolean;
  allowFutureSteps?: boolean;
  step1img1Class?: string;
  step1img2Class?: string;
  step2img1Class?: string;
  step2img2Class?: string;
  step3imgClass?: string;
  step4imgClass?: string;
  image?: OnboardingImageSet;
  renderStepPreview?: (step: number) => ReactNode;
}

interface StepImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
}

const TOTAL_STEPS = 4;

const ANIMATION_PRESETS = {
  fadeInScale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
      mass: 0.5,
    },
  },
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
      mass: 0.5,
    },
  },
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
      mass: 0.5,
    },
  },
} as const;

type AnimationPreset = keyof typeof ANIMATION_PRESETS;

interface AnimatedStepImageProps extends StepImageProps {
  preset?: AnimationPreset;
  delay?: number;
  onAnimationComplete?: () => void;
  reducedMotion?: boolean;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

function useNumberCycler(interval: number, enabled: boolean, onTick?: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setupTimer = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onTick?.();
      setupTimer();
    }, interval);
  }, [enabled, interval, onTick]);

  useEffect(() => {
    setupTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [setupTimer]);

  return { resetTimer: setupTimer };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isMobile;
}

const stepVariants: Variants = {
  inactive: { scale: 0.96, opacity: 0.78 },
  active: { scale: 1, opacity: 1 },
};

const StepImage = forwardRef<HTMLImageElement, StepImageProps>(
  ({ src, alt, className, style, width = 1200, height = 630, ...props }, ref) => (
    <img
      ref={ref}
      alt={alt}
      className={className}
      src={src}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      style={{
        position: "absolute",
        userSelect: "none",
        maxWidth: "unset",
        objectFit: "cover",
        ...style,
      }}
      {...props}
    />
  )
);
StepImage.displayName = "StepImage";

const MotionStepImage = motion.create(StepImage);

function AnimatedStepImage({
  preset = "fadeInScale",
  delay = 0,
  onAnimationComplete,
  reducedMotion,
  ...props
}: AnimatedStepImageProps) {
  if (reducedMotion) {
    return <StepImage {...props} />;
  }

  const presetConfig = ANIMATION_PRESETS[preset];
  return (
    <MotionStepImage
      {...props}
      {...presetConfig}
      transition={{ ...presetConfig.transition, delay }}
      onAnimationComplete={onAnimationComplete}
    />
  );
}

function FeatureCard({
  bgClass,
  children,
  step,
  steps,
  onStepChange,
  allowFutureSteps = false,
}: CardProps & {
  children: React.ReactNode;
  step: number;
  steps: readonly OnboardingStep[];
  onStepChange: (index: number) => void;
  allowFutureSteps?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const xTemplate = useMotionTemplate`${mouseX}px`;
  const yTemplate = useMotionTemplate`${mouseY}px`;

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    if (isMobile || reducedMotion) return;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  const content = (
    <div
      className={clsx(
        "onboarding-hero group relative w-full overflow-hidden rounded-3xl border shadow-subtle-3",
        bgClass
      )}
    >
      <div className="border-b border-white/10 px-4 py-4 md:px-8 md:py-5">
        <Steps
          current={step}
          onChange={onStepChange}
          steps={steps}
          allowFutureSteps={allowFutureSteps}
        />
      </div>

      <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-center md:gap-10 md:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="relative z-10 flex min-w-0 flex-col gap-3"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          >
            <p className="type-caption font-medium uppercase tracking-wide text-[#c1e8ef]/90">
              Step {step + 1} of {steps.length}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-white md:text-2xl md:leading-tight">
              {steps[step]?.title}
            </h2>
            <p className="text-sm leading-relaxed text-white/90 sm:text-base">
              <Balancer>{steps[step]?.description}</Balancer>
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="relative min-h-[220px] overflow-hidden rounded-2xl bg-[#111a4a]/25 md:min-h-[300px]">
          {mounted ? children : null}
        </div>
      </div>
    </div>
  );

  if (reducedMotion) {
    return <div className="relative w-full rounded-[16px]">{content}</div>;
  }

  return (
    <motion.div
      className="animated-cards relative w-full rounded-[16px]"
      onMouseMove={handleMouseMove}
      style={
        {
          "--x": xTemplate,
          "--y": yTemplate,
        } as WrapperStyle
      }
    >
      {content}
    </motion.div>
  );
}

function Steps({
  steps: stepData,
  current,
  onChange,
  allowFutureSteps = false,
}: {
  steps: readonly OnboardingStep[];
  current: number;
  onChange: (index: number) => void;
  allowFutureSteps?: boolean;
}) {
  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex w-full flex-wrap items-center justify-center gap-2 md:gap-3" role="list">
        {stepData.map((step, stepIdx) => {
          const isCompleted = current > stepIdx;
          const isCurrent = current === stepIdx;
          const isFuture = !isCompleted && !isCurrent;

          return (
            <motion.li
              key={`${step.name}-${stepIdx}`}
              initial="inactive"
              animate={isCurrent ? "active" : "inactive"}
              variants={stepVariants}
              transition={{ duration: 0.25 }}
              className={cn(
                "relative rounded-full px-3 py-1.5 transition-all duration-300",
                isCompleted ? "bg-[#167e6c]/25" : "bg-white/12",
                isCurrent && "bg-white/18 ring-1 ring-white/25"
              )}
            >
              <button
                type="button"
                className={cn(
                  "group flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#167e6c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111a4a]",
                  isFuture && !allowFutureSteps && "cursor-default opacity-60"
                )}
                onClick={() => onChange(stepIdx)}
                disabled={!allowFutureSteps && isFuture}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold duration-300",
                    isCompleted && "bg-[#167e6c] text-white",
                    isCurrent && "bg-white text-[#111a4a]",
                    isFuture && "bg-white/20 text-white/85"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                  ) : (
                    <span className="text-xs font-medium">{stepIdx + 1}</span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium duration-300",
                    isCompleted && "text-white/85",
                    isCurrent && "text-white",
                    isFuture && "text-white/70"
                  )}
                >
                  {step.name}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </nav>
  );
}

const defaultClasses = {
  step1img1:
    "pointer-events-none w-[50%] rounded-2xl border border-white/15 transition-all duration-500",
  step1img2:
    "pointer-events-none w-[60%] overflow-hidden rounded-2xl border border-white/15 transition-all duration-500",
  step2img1:
    "pointer-events-none w-[50%] overflow-hidden rounded-2xl border border-white/15 transition-all duration-500",
  step2img2:
    "pointer-events-none w-[40%] overflow-hidden rounded-2xl border border-white/15 transition-all duration-500",
  step3img:
    "pointer-events-none w-[90%] overflow-hidden rounded-2xl border border-white/15 transition-all duration-500",
  step4img:
    "pointer-events-none w-[90%] overflow-hidden rounded-2xl border border-white/15 transition-all duration-500",
} as const;

export function FeatureCarousel({
  image,
  renderStepPreview,
  steps,
  currentStep: step,
  onStepChange,
  autoAdvance = false,
  autoAdvanceMs = 5000,
  clickToAdvance = false,
  allowFutureSteps = false,
  step1img1Class = defaultClasses.step1img1,
  step1img2Class = defaultClasses.step1img2,
  step2img1Class = defaultClasses.step2img1,
  step2img2Class = defaultClasses.step2img2,
  step3imgClass = defaultClasses.step3img,
  step4imgClass = defaultClasses.step4img,
  ...props
}: FeatureCarouselProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setIsAnimating(false);
  }, [step]);

  const handleAdvance = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    onStepChange(Math.min(step + 1, TOTAL_STEPS - 1));
  }, [isAnimating, onStepChange, step]);

  useNumberCycler(autoAdvanceMs, autoAdvance && step < TOTAL_STEPS - 1, handleAdvance);

  const handleAnimationComplete = () => setIsAnimating(false);

  const renderStepContent = () => {
    const content = () => {
      if (renderStepPreview) {
        return (
          <motion.div
            className="relative h-full w-full"
            onAnimationComplete={handleAnimationComplete}
          >
            {renderStepPreview(step)}
          </motion.div>
        );
      }

      if (!image) return null;

      switch (step) {
        case 0:
          return (
            <motion.div
              className="relative h-full w-full"
              onAnimationComplete={handleAnimationComplete}
            >
              <AnimatedStepImage
                alt={image.alt}
                className={clsx(step1img1Class)}
                src={image.step1light1}
                preset="slideInLeft"
                reducedMotion={reducedMotion}
              />
              <AnimatedStepImage
                alt={image.alt}
                className={clsx(step1img2Class)}
                src={image.step1light2}
                preset="slideInRight"
                delay={0.1}
                reducedMotion={reducedMotion}
              />
            </motion.div>
          );
        case 1:
          return (
            <motion.div
              className="relative h-full w-full"
              onAnimationComplete={handleAnimationComplete}
            >
              <AnimatedStepImage
                alt={image.alt}
                className={clsx(step2img1Class)}
                src={image.step2light1}
                preset="fadeInScale"
                reducedMotion={reducedMotion}
              />
              <AnimatedStepImage
                alt={image.alt}
                className={clsx(step2img2Class)}
                src={image.step2light2}
                preset="fadeInScale"
                delay={0.1}
                reducedMotion={reducedMotion}
              />
            </motion.div>
          );
        case 2:
          return (
            <AnimatedStepImage
              alt={image.alt}
              className={clsx(step3imgClass)}
              src={image.step3light}
              preset="fadeInScale"
              onAnimationComplete={handleAnimationComplete}
              reducedMotion={reducedMotion}
            />
          );
        case 3:
          return (
            <AnimatedStepImage
              alt={image.alt}
              className={clsx(step4imgClass)}
              src={image.step4light}
              preset="fadeInScale"
              onAnimationComplete={handleAnimationComplete}
              reducedMotion={reducedMotion}
            />
          );
        default:
          return null;
      }
    };

    if (reducedMotion) {
      return <div className="absolute h-full w-full">{content()}</div>;
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          {...ANIMATION_PRESETS.fadeInScale}
          className="absolute h-full w-full"
        >
          {content()}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <FeatureCard
      {...props}
      step={step}
      steps={steps}
      onStepChange={onStepChange}
      allowFutureSteps={allowFutureSteps}
    >
      {renderStepContent()}
      {clickToAdvance && !autoAdvance && step < TOTAL_STEPS - 1 && (
        <button
          type="button"
          className="absolute inset-0 z-40 cursor-pointer rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#167e6c]"
          aria-label="Next step"
          onClick={handleAdvance}
        />
      )}
    </FeatureCard>
  );
}

FeatureCarousel.displayName = "FeatureCarousel";
