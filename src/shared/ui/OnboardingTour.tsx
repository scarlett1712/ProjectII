"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { markTourCompleted, shouldShowTour } from "@/shared/client/onboarding";
import { effects } from "@/shared/theme/tokens";
import { Button } from "@/shared/ui/components";
import { lockBackgroundScroll, unlockBackgroundScroll } from "@/shared/ui/components/scrollLock";

export interface TourStep {
  selector: string;
  title: string;
  content: string;
}

interface OnboardingTourProps {
  pageKey: string;
  steps: TourStep[];
  onComplete?: () => void;
}

export function OnboardingTour({ pageKey, steps, onComplete }: OnboardingTourProps) {
  const tShell = useTranslations("shell");
  const tc = useTranslations("common");
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });
  const animationFrameId = useRef<number | null>(null);

  const { data: session } = useSession();
  const userEmail = session?.user?.email || "";

  useEffect(() => {
    setIsMounted(true);
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });

    if (shouldShowTour(pageKey, userEmail) && steps.length > 0) {
      // Start tour with a slight delay so page elements render fully
      const timer = setTimeout(() => {
        setCurrentStepIdx(0);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [pageKey, steps, userEmail]);

  const activeStep = currentStepIdx >= 0 && currentStepIdx < steps.length ? steps[currentStepIdx] : null;

  // Lock background scrolling during the tour. Share the modal lock counter so closing the tour preserves any active modal lock.
  const tourActive = currentStepIdx !== -1;
  useEffect(() => {
    if (!tourActive) return;
    lockBackgroundScroll();
    return unlockBackgroundScroll;
  }, [tourActive]);

  // Scroll active element into view
  useEffect(() => {
    if (activeStep) {
      const el = document.querySelector(activeStep.selector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentStepIdx, activeStep]);

  // Track position of highlighted element
  useEffect(() => {
    if (!activeStep) {
      setRect(null);
      return;
    }

    const updatePosition = () => {
      const el = document.querySelector(activeStep.selector);
      if (el) {
        const currentRect = el.getBoundingClientRect();
        // Only update state if position changed to avoid infinite loop
        setRect((prev) => {
          if (
            prev &&
            prev.top === currentRect.top &&
            prev.left === currentRect.left &&
            prev.width === currentRect.width &&
            prev.height === currentRect.height
          ) {
            return prev;
          }
          return currentRect;
        });
      } else {
        setRect(null);
      }
      animationFrameId.current = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [activeStep]);

  if (!isMounted || currentStepIdx === -1 || !activeStep) return null;

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    markTourCompleted(pageKey, userEmail);

    setCurrentStepIdx(-1);
    if (onComplete) onComplete();
  };

  // Tooltip position calculations
  let cardTop = windowSize.height / 2 - 100;
  let cardLeft = windowSize.width / 2 - 160;

  if (rect) {
    // Prefer putting below the element
    if (rect.bottom + 220 < windowSize.height) {
      cardTop = rect.bottom + 16;
      cardLeft = rect.left + rect.width / 2 - 160;
    } else if (rect.top - 220 > 0) {
      // Put above
      cardTop = rect.top - 200;
      cardLeft = rect.left + rect.width / 2 - 160;
    } else {
      // Center
      cardTop = windowSize.height / 2 - 100;
      cardLeft = windowSize.width / 2 - 160;
    }

    // Clamp coordinates
    cardLeft = Math.max(16, Math.min(windowSize.width - 320 - 16, cardLeft));
    cardTop = Math.max(16, Math.min(windowSize.height - 180 - 16, cardTop));
  }

  return createPortal(
    <>
      {/* Darkened backdrop blocking page clicks */}
      <div className="fixed inset-0 z-[9990] bg-black/10 pointer-events-auto" />

      {/* Shadow Mask Cutout */}
      {rect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: "16px",
            boxShadow: effects.spotlightScrim,
            zIndex: 9991,
            pointerEvents: "none",
          }}
          className="border-2 border-dashed border-primary shadow-brand-glow transition-all duration-300"
        />
      )}

      {/* Tour Step Card Tooltip */}
      <div
        className="fixed z-[9995] w-[320px] transition-all duration-300 pointer-events-auto"
        style={{ top: cardTop, left: cardLeft }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white rounded-panel border border-purple-100 p-5 shadow-float-lg flex flex-col relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 bg-primary-soft px-3 py-1 rounded-full">
              <span className="text-xs">{tShell("onboardingTour.badgeIcon")}</span>
              <span className="text-caption font-black text-primary uppercase tracking-wider">{tShell("onboardingTour.badge")}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              {tc("action.skip")}
            </Button>
          </div>

          {/* Step Info */}
          <h4 className="text-sm font-black text-gray-800 leading-snug mb-1">
            {activeStep.title}
          </h4>
          <p className="text-xs font-semibold text-gray-600 leading-relaxed mb-4">
            {activeStep.content}
          </p>

          {/* Footer controls */}
          <div className="flex items-center justify-between mt-1 pt-3 border-t border-purple-50">
            {/* Step indicator dot progress */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    currentStepIdx === i ? "w-4 bg-primary" : "w-1.5 bg-gray-200"
                  }`}
                />
              ))}
            </div>

            <Button size="sm" onClick={handleNext}>
              {currentStepIdx === steps.length - 1 ? (
                <>
                  {tc("action.done")}
                  <Check className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  {tShell("onboardingTour.next")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}
