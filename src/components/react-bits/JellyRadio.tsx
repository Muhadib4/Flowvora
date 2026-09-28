"use client";

import { useId, type HTMLAttributes, type ReactNode } from "react";

import styles from "./controls.module.css";

export interface JellyRadioOption<Value extends string = string> {
  value: Value;
  label: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

export interface JellyRadioProps<Value extends string = string>
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: readonly JellyRadioOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  name?: string;
  ariaLabel?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

/**
 * A compact, native-radio segmented control with a restrained jelly response.
 * Native inputs preserve arrow-key navigation and form semantics.
 */
export function JellyRadio<Value extends string = string>({
  options,
  value,
  onValueChange,
  name,
  ariaLabel,
  disabled = false,
  size = "md",
  className,
  "aria-label": ariaLabelAttribute,
  "aria-labelledby": ariaLabelledBy,
  ...groupProps
}: JellyRadioProps<Value>) {
  const generatedName = useId();
  const groupName = name ?? generatedName;

  return (
    <div
      {...groupProps}
      aria-disabled={disabled || undefined}
      aria-label={
        ariaLabel ?? ariaLabelAttribute ?? (ariaLabelledBy === undefined ? "Choose an option" : undefined)
      }
      aria-labelledby={ariaLabelledBy}
      className={[styles.jellyRadio, className].filter(Boolean).join(" ")}
      data-size={size}
      role="radiogroup"
    >
      {options.map((option, index) => {
        const optionDisabled = disabled || option.disabled;
        const optionId = `${generatedName}-${index}`;

        return (
          <label className={styles.jellyOption} htmlFor={optionId} key={option.value}>
            <input
              aria-label={option.ariaLabel}
              checked={value === option.value}
              className={styles.jellyInput}
              disabled={optionDisabled}
              id={optionId}
              name={groupName}
              onChange={() => onValueChange(option.value)}
              type="radio"
              value={option.value}
            />
            <span className={styles.jellySegment}>
              <span className={styles.jellySegmentLabel}>{option.label}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
