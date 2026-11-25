"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ASSETS } from "@/shared/config/routes";
import { colors } from "@/shared/theme/tokens";
import type { PetMood } from "./starPersonalities";

interface StarPetSpriteProps {
  size: number;
  alt: string;
  mood: PetMood;
  facing: "left" | "right";
}

/**
 * Splits public/chatbot-star.png into the star body and its two rainbow legs using CSS clip-path
 * so both legs swing independently when walking, dancing or being dragged.
 */
export function StarPetSprite({ size, alt, mood, facing }: StarPetSpriteProps) {
  const isWalking = mood === "walking";
  const isDancing = mood === "singing" || mood === "celebrating";
  const isDragging = mood === "dragging" || mood === "pouting";
  const isSleepy = mood === "sleepy";

  const bodyAnimate = isWalking
    ? { y: [0, -4, 0, -4, 0], rotate: [-2.5, 2.5, -2.5] }
    : isDancing
      ? { y: [0, -8, 0, -6, 0], rotate: [-6, 6, -6] }
      : isDragging
        ? { rotate: [-8, 8, -8], scale: [1, 0.96, 1] }
        : isSleepy
          ? { y: [0, 2, 0], scale: [1, 0.98, 1] }
          : { y: [0, -2, 0], rotate: 0 };

  const bodyTransition = isWalking
    ? { repeat: Infinity, duration: 0.55, ease: "easeInOut" as const }
    : isDancing
      ? { repeat: Infinity, duration: 0.65, ease: "easeInOut" as const }
      : isDragging
        ? { repeat: Infinity, duration: 0.35, ease: "easeInOut" as const }
        : { repeat: Infinity, duration: 2.6, ease: "easeInOut" as const };

  const leftLegAnimate = isWalking
    ? { rotate: [-18, 18, -18] }
    : isDancing
      ? { rotate: [-12, 14, -12], y: [0, -2, 0] }
      : isDragging
        ? { rotate: [-26, 20, -26] }
        : { rotate: 0, y: 0 };

  const rightLegAnimate = isWalking
    ? { rotate: [18, -18, 18] }
    : isDancing
      ? { rotate: [14, -12, 14], y: [0, -2, 0] }
      : isDragging
        ? { rotate: [26, -20, 26] }
        : { rotate: 0, y: 0 };

  const legTransition = isWalking
    ? { repeat: Infinity, duration: 0.55, ease: "easeInOut" as const }
    : isDancing
      ? { repeat: Infinity, duration: 0.65, ease: "easeInOut" as const }
      : isDragging
        ? { repeat: Infinity, duration: 0.28, ease: "easeInOut" as const }
        : { duration: 0.25 };

  return (
    <div
      className="relative select-none pointer-events-none"
      style={{
        width: size,
        height: size,
        transform: facing === "left" ? "scaleX(-1)" : undefined,
        transition: "transform 0.2s ease",
      }}
    >
      {/* Left rainbow leg */}
      <motion.div
        className="absolute inset-0"
        style={{
          clipPath: "inset(66% 50% 0% 28%)",
          transformOrigin: "43% 68%",
        }}
        animate={leftLegAnimate}
        transition={legTransition}
      >
        <Image src={ASSETS.mascotIcon} alt="" width={size} height={size} priority className="h-full w-full object-contain" />
      </motion.div>

      {/* Right rainbow leg */}
      <motion.div
        className="absolute inset-0"
        style={{
          clipPath: "inset(66% 28% 0% 50%)",
          transformOrigin: "57% 68%",
        }}
        animate={rightLegAnimate}
        transition={legTransition}
      >
        <Image src={ASSETS.mascotIcon} alt="" width={size} height={size} priority className="h-full w-full object-contain" />
      </motion.div>

      {/* Star body (excludes rainbow legs area) */}
      <motion.div
        className="absolute inset-0"
        style={{
          clipPath: "polygon(0% 0%, 100% 0%, 100% 88%, 68% 88%, 64% 71%, 50% 66%, 36% 71%, 32% 88%, 0% 88%)",
          transformOrigin: "50% 65%",
        }}
        animate={bodyAnimate}
        transition={bodyTransition}
      >
        <Image src={ASSETS.mascotIcon} alt={alt} width={size} height={size} priority className="h-full w-full object-contain" />

        {/* Pouting / grumpy eyebrow overlay when dragged */}
        {isDragging && (
          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <path d="M32 45 L42 49" stroke={colors.noteInk} strokeWidth="2.8" strokeLinecap="round" />
            <path d="M68 45 L58 49" stroke={colors.noteInk} strokeWidth="2.8" strokeLinecap="round" />
          </svg>
        )}
      </motion.div>

      {/* Floating music notes when singing */}
      {mood === "singing" && (
        <motion.span
          className="pointer-events-none absolute -top-2 right-1 text-sm font-bold text-primary"
          animate={{ y: [0, -10, -16], opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
        >
          🎵
        </motion.span>
      )}

      {/* Floating Zzz when sleepy */}
      {isSleepy && (
        <motion.span
          className="pointer-events-none absolute -top-2 right-1 text-xs font-bold text-primary"
          animate={{ y: [0, -8, -14], opacity: [0.3, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          💤
        </motion.span>
      )}
    </div>
  );
}
