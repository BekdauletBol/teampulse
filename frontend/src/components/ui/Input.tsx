import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { Bubble } from "./Bubble";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const errId = `${inputId}-err`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? errId : undefined}
        className={cn(
          "min-h-[44px] w-full rounded-2xl border bg-surface px-4 text-[15px] text-ink placeholder:text-muted",
          "transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-accent/40",
          error ? "border-danger" : "border-line focus:border-accent",
          className,
        )}
        {...rest}
      />
      {error ? (
        <Bubble tone="error" size="sm" id={errId} role="alert">
          {error}
        </Bubble>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  );
});
