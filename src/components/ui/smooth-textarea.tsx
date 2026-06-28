import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import React, {
  type ComponentPropsWithoutRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { cn } from "@/lib/utils";

const CARET_SPRING = { stiffness: 500, damping: 30, mass: 0.5 };
const REDUCED_MOTION_SPRING = { stiffness: 10000, damping: 100, mass: 0.1 };

type SmoothTextareaProps = ComponentPropsWithoutRef<"textarea">;

function getCaretIndex(target: HTMLTextAreaElement) {
  const selectionStart = target.selectionStart ?? 0;
  const selectionEnd = target.selectionEnd ?? 0;

  if (selectionStart === selectionEnd) {
    return selectionStart;
  }

  return target.selectionDirection === "backward" ? selectionStart : selectionEnd;
}

function syncMirrorStyles(textarea: HTMLTextAreaElement, mirror: HTMLDivElement) {
  const styles = window.getComputedStyle(textarea);

  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.font = `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
  mirror.style.lineHeight = styles.lineHeight;
  mirror.style.letterSpacing = styles.letterSpacing;
  mirror.style.fontFeatureSettings = styles.fontFeatureSettings;
  mirror.style.fontVariationSettings = styles.fontVariationSettings;
  mirror.style.padding = styles.padding;
  mirror.style.border = styles.border;
  mirror.style.boxSizing = styles.boxSizing;
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflowWrap = "break-word";
}

function scrollCaretIntoView(
  target: HTMLTextAreaElement,
  caretTop: number,
  caretLeft: number,
  caretHeight: number,
) {
  const styles = window.getComputedStyle(target);
  const paddingTop = parseFloat(styles.paddingTop) || 0;
  const paddingLeft = parseFloat(styles.paddingLeft) || 0;
  const paddingRight = parseFloat(styles.paddingRight) || 0;
  const paddingBottom = parseFloat(styles.paddingBottom) || 0;

  const maxScrollTop = Math.max(0, target.scrollHeight - target.clientHeight);
  const maxScrollLeft = Math.max(0, target.scrollWidth - target.clientWidth);
  const visibleBottom = target.scrollTop + target.clientHeight - paddingBottom;
  const visibleRight = target.scrollLeft + target.clientWidth - paddingRight;
  const visibleTop = target.scrollTop + paddingTop;
  const visibleLeft = target.scrollLeft + paddingLeft;

  if (caretTop + caretHeight > visibleBottom) {
    target.scrollTop = Math.min(
      caretTop + caretHeight - target.clientHeight + paddingBottom,
      maxScrollTop,
    );
  } else if (caretTop < visibleTop) {
    target.scrollTop = Math.max(0, caretTop - paddingTop);
  }

  if (caretLeft > visibleRight) {
    target.scrollLeft = Math.min(
      caretLeft - target.clientWidth + paddingRight,
      maxScrollLeft,
    );
  } else if (caretLeft < visibleLeft) {
    target.scrollLeft = Math.max(0, caretLeft - paddingLeft);
  }
}

export const SmoothTextarea = React.forwardRef<HTMLTextAreaElement, SmoothTextareaProps>(
  ({ className, value, onChange, onBlur, onFocus, disabled, style, ...props }, ref) => {
    const caretX = useMotionValue(0);
    const caretY = useMotionValue(0);
    const caretOpacity = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<HTMLSpanElement>(null);
    const prefersReducedMotion = useReducedMotion();

    const springCaretX = useSpring(
      caretX,
      prefersReducedMotion ? REDUCED_MOTION_SPRING : CARET_SPRING,
    );
    const springCaretY = useSpring(
      caretY,
      prefersReducedMotion ? REDUCED_MOTION_SPRING : CARET_SPRING,
    );

    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const updateCaretFromTextarea = (target: HTMLTextAreaElement) => {
      const mirror = mirrorRef.current;
      const marker = markerRef.current;
      if (!mirror || !marker) return;

      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;
      const hasSelection = selectionStart !== selectionEnd;
      const caretIndex = getCaretIndex(target);
      const text = target.value;
      const afterChar = text[caretIndex] ?? " ";

      syncMirrorStyles(target, mirror);

      while (mirror.firstChild) {
        mirror.removeChild(mirror.firstChild);
      }
      if (caretIndex > 0) {
        mirror.appendChild(document.createTextNode(text.slice(0, caretIndex)));
      }
      marker.textContent = afterChar === "\n" ? " " : afterChar;
      mirror.appendChild(marker);
      if (caretIndex + 1 < text.length) {
        mirror.appendChild(document.createTextNode(text.slice(caretIndex + 1)));
      }

      const styles = window.getComputedStyle(target);
      const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.55;
      const caretLeft = marker.offsetLeft;
      const caretTop = marker.offsetTop;

      scrollCaretIntoView(target, caretTop, caretLeft, lineHeight);

      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingTop = parseFloat(styles.paddingTop) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const paddingBottom = parseFloat(styles.paddingBottom) || 0;

      const x = caretLeft - target.scrollLeft;
      const y = caretTop - target.scrollTop;
      const minX = paddingLeft - 1;
      const maxX = target.clientWidth - paddingRight;
      const minY = paddingTop - 1;
      const maxY = target.clientHeight - paddingBottom;

      caretX.set(Math.min(x, maxX));
      caretY.set(y);

      const isCaretVisible =
        x >= minX && x <= maxX + 1 && y >= minY && y <= maxY + 1;

      if (!isCaretVisible || hasSelection || disabled) {
        caretOpacity.set(0);
        return;
      }

      caretOpacity.set(1);
    };

    const updateCaretRef = useRef(updateCaretFromTextarea);
    updateCaretRef.current = updateCaretFromTextarea;
    const caretOpacityRef = useRef(caretOpacity);
    caretOpacityRef.current = caretOpacity;

    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea && document.activeElement === textarea) {
        updateCaretRef.current(textarea);
      }
    }, [value]);

    useEffect(() => {
      const textarea = textareaRef.current;
      const container = containerRef.current;
      if (!textarea || !container) return;

      const updateCaretIfFocused = () => {
        if (document.activeElement === textarea) {
          updateCaretRef.current(textarea);
        }
      };

      const handleSelectionChange = () => {
        if (document.activeElement !== textarea) return;

        requestAnimationFrame(() => {
          if (document.activeElement === textarea) {
            updateCaretRef.current(textarea);
          }
        });
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      document.fonts.addEventListener("loadingdone", updateCaretIfFocused);
      void document.fonts.ready.then(updateCaretIfFocused);
      textarea.addEventListener("scroll", updateCaretIfFocused, { passive: true });

      const resizeObserver = new ResizeObserver(updateCaretIfFocused);
      resizeObserver.observe(container);

      updateCaretIfFocused();

      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        document.fonts.removeEventListener("loadingdone", updateCaretIfFocused);
        textarea.removeEventListener("scroll", updateCaretIfFocused);
        resizeObserver.disconnect();
      };
    }, []);

    const useNativeCaret = prefersReducedMotion || disabled;

    return (
      <div
        ref={containerRef}
        className="relative grid grid-cols-1"
        style={useNativeCaret ? undefined : { caretColor: "transparent" }}
      >
        <textarea
          {...props}
          ref={textareaRef}
          value={value}
          disabled={disabled}
          className={cn(
            "col-start-1 col-end-2 row-start-1 row-end-2 text-inherit",
            className,
          )}
          style={style}
          onChange={(event) => {
            onChange?.(event);
            requestAnimationFrame(() => {
              updateCaretRef.current(event.target);
            });
          }}
          onFocus={(event) => {
            onFocus?.(event);
            requestAnimationFrame(() => {
              updateCaretRef.current(event.target);
            });
          }}
          onBlur={(event) => {
            caretOpacityRef.current.set(0);
            onBlur?.(event);
          }}
          onKeyUp={(event) => {
            props.onKeyUp?.(event);
            requestAnimationFrame(() => {
              updateCaretRef.current(event.currentTarget);
            });
          }}
          onClick={(event) => {
            props.onClick?.(event);
            requestAnimationFrame(() => {
              updateCaretRef.current(event.currentTarget);
            });
          }}
        />
        {!useNativeCaret && (
          <>
            <div
              ref={mirrorRef}
              aria-hidden
              className="pointer-events-none invisible absolute top-0 left-0"
            >
              <span ref={markerRef} />
            </div>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute top-0 left-0 h-[0.9em] w-0.5 self-center bg-primary"
              style={{ x: springCaretX, y: springCaretY, opacity: caretOpacity }}
            />
          </>
        )}
      </div>
    );
  },
);

SmoothTextarea.displayName = "SmoothTextarea";
