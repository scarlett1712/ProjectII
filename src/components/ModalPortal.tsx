"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

let activeModalCount = 0;
let prevBodyOverflow = "";
let prevHtmlOverflow = "";
let prevMainOverflow = "";

function lockScroll() {
  if (typeof document === "undefined") return;
  if (activeModalCount === 0) {
    prevBodyOverflow = document.body.style.overflow;
    prevHtmlOverflow = document.documentElement.style.overflow;
    const mainEl = document.querySelector("main");
    prevMainOverflow = mainEl ? mainEl.style.overflow : "";

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (mainEl) {
      mainEl.style.overflow = "hidden";
    }
  }
  activeModalCount++;
}

function unlockScroll() {
  if (typeof document === "undefined") return;
  activeModalCount = Math.max(0, activeModalCount - 1);
  if (activeModalCount === 0) {
    document.body.style.overflow = prevBodyOverflow;
    document.documentElement.style.overflow = prevHtmlOverflow;
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.style.overflow = prevMainOverflow;
    }
  }
}

interface ModalPortalProps {
  children: ReactNode;
}

export function ModalPortal({ children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    lockScroll();

    return () => {
      unlockScroll();
    };
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}
