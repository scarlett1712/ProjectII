"use client";

import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmOptions {
  message: ReactNode;
  /** Defaults to the localized confirmation label. */
  title?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** Use the default danger tone for deletions and irreversible actions. */
  tone?: "danger" | "primary";
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/** Provide useConfirm throughout the app for confirmation dialogs in place of window.confirm. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const tc = useTranslations("common");
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((options) => {
    // Treat an unanswered previous dialog as cancelled.
    resolver.current?.(false);
    setRequest(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={request !== null}
        onClose={() => answer(false)}
        title={request?.title ?? tc("action.confirm")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => answer(false)}>
              {request?.cancelLabel ?? tc("action.cancel")}
            </Button>
            <Button
              variant={request?.tone === "primary" ? "primary" : "danger"}
              className="flex-1"
              onClick={() => answer(true)}
              autoFocus
            >
              {request?.confirmLabel ?? tc("action.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-sm font-medium text-ink-secondary">{request?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

/** `const confirm = useConfirm(); if (!(await confirm({ message }))) return;` */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
