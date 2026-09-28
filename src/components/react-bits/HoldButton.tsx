"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import styles from "./controls.module.css";

type HoldPhase = "idle" | "holding" | "complete";

export interface HoldButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "onClick" | "onKeyDown" | "onKeyUp" | "onPointerDown" | "onPointerUp"
  > {
  children: ReactNode;
  onComplete: () => void;
  holdDuration?: number;
  holdingLabel?: ReactNode;
  completeLabel?: ReactNode;
}

const MINIMUM_HOLD_DURATION = 300;
const COMPLETE_DISPLAY_DURATION = 650;

/**
 * Requires a continuous pointer or keyboard hold before invoking a destructive action.
 * Space and Enter receive the same timing requirement as pointer input.
 */
export function HoldButton({
  children,
  onComplete,
  holdDuration = 1_400,
  holdingLabel = "Keep holding…",
  completeLabel = "Confirmed",
  className,
  disabled,
  type,
  onBlur,
  ...buttonProps
}: HoldButtonProps) {
  const [phase, setPhase] = useState<HoldPhase>("idle");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartedAtRef = useRef<number | null>(null);
  const isHoldingRef = useRef(false);
  const didCompleteRef = useRef(false);
  const disabledRef = useRef(disabled);
  const statusId = useId();
  disabledRef.current = disabled;
  const safeDuration =
    Number.isFinite(holdDuration) && holdDuration >= MINIMUM_HOLD_DURATION
      ? holdDuration
      : MINIMUM_HOLD_DURATION;

  const clearAnimationFrame = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const setVisualProgress = useCallback((progress: number) => {
    buttonRef.current?.style.setProperty("--hold-progress", String(progress));
  }, []);

  const resetButton = useCallback(() => {
    clearAnimationFrame();
    isHoldingRef.current = false;
    didCompleteRef.current = false;
    holdStartedAtRef.current = null;
    setVisualProgress(0);
    setPhase("idle");
  }, [clearAnimationFrame, setVisualProgress]);

  const cancelHold = useCallback(() => {
    if (!isHoldingRef.current || didCompleteRef.current) {
      return;
    }

    resetButton();
  }, [resetButton]);

  const beginHold = useCallback(() => {
    if (disabledRef.current || isHoldingRef.current || didCompleteRef.current) {
      return;
    }

    if (resetTimeoutRef.current !== null) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    isHoldingRef.current = true;
    didCompleteRef.current = false;
    holdStartedAtRef.current = performance.now();
    setVisualProgress(0);
    setPhase("holding");

    const advance = (now: number) => {
      const startedAt = holdStartedAtRef.current;
      if (!isHoldingRef.current || startedAt === null) {
        return;
      }

      if (disabledRef.current) {
        resetButton();
        return;
      }

      const progress = Math.min((now - startedAt) / safeDuration, 1);
      setVisualProgress(progress);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(advance);
        return;
      }

      animationFrameRef.current = null;
      isHoldingRef.current = false;
      didCompleteRef.current = true;
      setPhase("complete");
      onComplete();

      resetTimeoutRef.current = setTimeout(() => {
        resetTimeoutRef.current = null;
        resetButton();
      }, COMPLETE_DISPLAY_DURATION);
    };

    animationFrameRef.current = requestAnimationFrame(advance);
  }, [onComplete, resetButton, safeDuration, setVisualProgress]);

  useEffect(() => {
    const handleWindowBlur = () => cancelHold();
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        cancelHold();
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearAnimationFrame();
      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [cancelHold, clearAnimationFrame]);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    beginHold();
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cancelHold();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    if (!event.repeat) {
      beginHold();
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    cancelHold();
  };

  const visibleLabel =
    phase === "holding" ? holdingLabel : phase === "complete" ? completeLabel : children;
  const statusText =
    phase === "holding"
      ? "Keep holding to confirm."
      : phase === "complete"
        ? "Action confirmed."
        : `Hold for ${(safeDuration / 1_000).toFixed(1)} seconds to confirm.`;

  return (
    <button
      {...buttonProps}
      aria-describedby={[buttonProps["aria-describedby"], statusId].filter(Boolean).join(" ")}
      className={[styles.holdButton, className].filter(Boolean).join(" ")}
      data-state={phase}
      disabled={disabled}
      onBlur={(event) => {
        cancelHold();
        onBlur?.(event);
      }}
      onClick={(event) => event.preventDefault()}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onLostPointerCapture={cancelHold}
      onPointerCancel={cancelHold}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      ref={buttonRef}
      style={{ ...buttonProps.style, "--hold-progress": 0 } as CSSProperties}
      type={type ?? "button"}
    >
      <span aria-hidden="true" className={styles.holdButtonProgress} />
      <span className={styles.holdButtonContent}>
        <span aria-hidden="true" className={styles.holdButtonIndicator} />
        <span className={styles.holdButtonLabel}>{visibleLabel}</span>
      </span>
      <span aria-live="polite" className={styles.visuallyHidden} id={statusId}>
        {statusText}
      </span>
    </button>
  );
}
