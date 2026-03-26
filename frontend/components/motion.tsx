"use client";

import { motion } from "framer-motion";

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2 } }
};

export const stagger = {
  animate: { transition: { staggerChildren: 0.06 } }
};

export const MotionDiv = motion.div;
export const MotionSection = motion.section;
export const MotionHeader = motion.header;
