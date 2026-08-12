export const easeOut = [0.22, 1, 0.36, 1];

export const INSTANT =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("skip") === "1";
export const ENTER_INITIAL = INSTANT ? false : "initial";

export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: easeOut } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.22, ease: easeOut } },
};

export const staggerParent = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

export const riseItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

export const scaleItem = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: easeOut } },
};

export const tapScale = { whileTap: { scale: 0.97 } };
