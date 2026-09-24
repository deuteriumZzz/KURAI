"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { MOTION } from "@/lib/motion";

const ease = MOTION.ease.out as unknown as [number, number, number, number];

type AppearProps = HTMLMotionProps<"div"> & {
  /** Порядковый номер для лесенки (задержка 35 мс на элемент). */
  index?: number;
  delay?: number;
  /** Анимировать при появлении в зоне видимости (для списков ниже первого экрана). */
  inView?: boolean;
};

/** Плавное появление: лёгкий подъём. Прозрачность не трогаем — контент виден всегда, даже если анимация не запустилась. */
export function Appear({ index = 0, delay = 0, inView = false, children, ...rest }: AppearProps) {
  const from = { y: 8 };
  const to = { y: 0, transition: { duration: MOTION.base / 1000, ease, delay: delay + Math.min(index, 12) * 0.035 } };
  return inView ? (
    <motion.div initial={from} whileInView={to} viewport={{ once: true, margin: "0px 0px -40px 0px" }} {...rest}>
      {children}
    </motion.div>
  ) : (
    <motion.div initial={from} animate={to} {...rest}>
      {children}
    </motion.div>
  );
}
