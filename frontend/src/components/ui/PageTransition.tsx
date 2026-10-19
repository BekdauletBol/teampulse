import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { page } from "../../lib/motion";

export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={page} initial="initial" animate="animate" exit="exit" className={className}>
      {children}
    </motion.div>
  );
}
