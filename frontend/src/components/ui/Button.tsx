import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../../lib/cn";
import { press } from "../../lib/motion";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium select-none whitespace-nowrap " +
  "transition-[box-shadow,background-color,color] duration-200 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "text-white bg-gradient-to-r from-accent to-accent-2 shadow-soft hover:shadow-lift",
  secondary: "bg-surface text-ink border border-line shadow-soft hover:border-accent/40",
  ghost: "bg-transparent text-ink hover:bg-bubble/60",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-4 text-sm",
  md: "min-h-[44px] px-5 text-[15px]",
  lg: "min-h-[52px] px-7 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      {...press}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </motion.button>
  );
});

type ButtonLinkProps = Omit<LinkProps, "className"> & { variant?: ButtonVariant; size?: ButtonSize; className?: string };

/** Link styled as a button. The press animation lives on a motion wrapper so router props stay typed. */
export function ButtonLink({ variant = "primary", size = "md", className, children, ...rest }: ButtonLinkProps) {
  return (
    <motion.span className="inline-block" {...press}>
      <Link className={buttonClass(variant, size, className)} {...rest}>
        {children}
      </Link>
    </motion.span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
    />
  );
}
