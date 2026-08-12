import React, { useEffect } from "react";
import { useMotionValue, useTransform, animate, motion } from "framer-motion";
import { INSTANT } from "../../lib/motion";

/**
 * Smoothly animates a number and renders it via `format`.
 * Respects Turkish formatting supplied by the caller.
 */
export default function AnimatedNumber({
  value = 0,
  format = (v) => v.toFixed(0),
  duration = 1.1,
  className = "",
  as = "span",
}) {
  const mv = useMotionValue(INSTANT ? Number(value || 0) : 0);
  const text = useTransform(mv, (v) => format(v));
  const MotionTag = motion[as] || motion.span;

  useEffect(() => {
    const controls = animate(mv, Number(value || 0), {
      duration: INSTANT ? 0 : duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [value, duration, mv]);

  return <MotionTag className={className}>{text}</MotionTag>;
}
