import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "../../lib/cn";
import { lift } from "../../lib/motion";

type Props = HTMLMotionProps<"div"> & {
  /** Lift 4px on hover with spring physics. */
  hover?: boolean;
  padding?: "none" | "md" | "lg";
};

const paddings = { none: "", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" };

export const Card = forwardRef<HTMLDivElement, Props>(function Card(
  { hover, padding = "md", className, ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative rounded-2xl border border-line bg-surface shadow-soft",
        hover && "hover:shadow-lift transition-shadow duration-200",
        paddings[padding],
        className,
      )}
      {...(hover ? lift : {})}
      {...rest}
    />
  );
});
