"use client";

import {
  useEffect,
  useRef,
  type ChangeEvent,
  type ChangeEventHandler,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import styles from "./controls.module.css";

export interface SpringCheckProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "onChange" | "size" | "type"> {
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
  size?: "sm" | "md";
  onCheckedChange?: (checked: boolean) => void;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

/** A native checkbox with tactile completion feedback and reduced-motion support. */
export function SpringCheck({
  label,
  description,
  indeterminate = false,
  size = "md",
  onCheckedChange,
  onChange,
  className,
  disabled,
  "aria-label": ariaLabel,
  ...inputProps
}: SpringCheckProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    onCheckedChange?.(event.currentTarget.checked);
  };

  const hasVisibleLabel = label !== undefined || description !== undefined;

  return (
    <label
      className={[styles.springCheck, className].filter(Boolean).join(" ")}
      data-disabled={disabled || undefined}
      data-indeterminate={indeterminate || undefined}
      data-size={size}
    >
      <input
        {...inputProps}
        aria-checked={indeterminate ? "mixed" : undefined}
        aria-label={ariaLabel ?? (hasVisibleLabel ? undefined : "Checkbox")}
        className={styles.springCheckInput}
        disabled={disabled}
        onChange={handleChange}
        ref={inputRef}
        type="checkbox"
      />
      <span aria-hidden="true" className={styles.springCheckBox}>
        <svg className={styles.springCheckIcon} viewBox="0 0 18 18">
          <path d="M4.15 9.15 7.35 12.35 13.95 5.75" />
        </svg>
        <span className={styles.springCheckDash} />
      </span>
      {hasVisibleLabel ? (
        <span className={styles.springCheckCopy}>
          {label !== undefined ? <span className={styles.springCheckLabel}>{label}</span> : null}
          {description !== undefined ? (
            <span className={styles.springCheckDescription}>{description}</span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}

