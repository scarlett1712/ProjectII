"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./Button";
import { cn } from "./cn";
import { lockBackgroundScroll, unlockBackgroundScroll } from "./scrollLock";

export type ModalSize = "sm" | "md" | "lg";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-[360px]",
  md: "max-w-[420px]",
  lg: "max-w-[500px]",
};

/** Modal stacking level above the draggable mascot (250) and below toasts (320). */
export const MODAL_Z_CLASS = "z-[260]";

// Only the topmost modal handles Escape so a single keypress closes one dialog.
const openStack: string[] = [];

const stopPropagation = (event: { stopPropagation: () => void }) => event.stopPropagation();

const subscribeNoop = () => () => undefined;
/** True after hydration, when document is available for createPortal. */
const useIsClient = () => useSyncExternalStore(subscribeNoop, () => true, () => false);

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Header title. Supply ariaLabel if the title is omitted. */
  title?: ReactNode;
  ariaLabel?: string;
  /** Maximum widths: sm 360px, md 420px, lg 500px. */
  size?: ModalSize;
  children: ReactNode;
  /** Footer area for action buttons. */
  footer?: ReactNode;
  /** Close on backdrop click by default. Disable this for long forms to prevent accidental dismissal. */
  closeOnBackdrop?: boolean;
  hideCloseButton?: boolean;
  /** Extra classes for the modal panel, for example to adjust padding. */
  className?: string;
}

/**
 * Standard modal with a dimmed backdrop, rounded white panel, title, close button and entry and exit animations.
 * Render into document.body through a portal so newer modals stack above earlier ones.
 */
export function Modal({
  open,
  onClose,
  title,
  ariaLabel,
  size = "md",
  children,
  footer,
  closeOnBackdrop = true,
  hideCloseButton = false,
  className,
}: ModalProps) {
  const tc = useTranslations("common");
  const id = useId();
  const titleId = `${id}-title`;
  const isClient = useIsClient();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    openStack.push(id);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && openStack.at(-1) === id) onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    lockBackgroundScroll();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openStack.splice(openStack.lastIndexOf(id), 1);
      unlockBackgroundScroll();
    };
  }, [open, id]);

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/40 p-3 backdrop-blur-sm sm:p-4",
            MODAL_Z_CLASS,
          )}
          onClick={(event) => {
            event.stopPropagation();
            if (closeOnBackdrop) onClose();
          }}
          // Portal events bubble to React ancestors such as clickable cards and drop targets.
          // Stop propagation here to prevent actions inside the modal from activating the underlying screen.
          onMouseDown={stopPropagation}
          onPointerDown={stopPropagation}
          onContextMenu={stopPropagation}
          onDragOver={stopPropagation}
          onDrop={stopPropagation}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : ariaLabel}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={stopPropagation}
            className={cn(
              "my-auto max-h-[90dvh] w-full overflow-y-auto rounded-panel border border-line bg-white p-6 shadow-2xl sm:p-8",
              sizeClasses[size],
              className,
            )}
          >
            {(title || !hideCloseButton) && (
              <div className="mb-5 flex items-center justify-between gap-3">
                {title ? (
                  <h3 id={titleId} className="text-lg font-black text-primary-ink">
                    {title}
                  </h3>
                ) : (
                  <span />
                )}
                {!hideCloseButton && (
                  <IconButton label={tc("action.close")} onClick={onClose}>
                    <X className="h-5 w-5" />
                  </IconButton>
                )}
              </div>
            )}
            {children}
            {footer && <div className="mt-6 flex gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
