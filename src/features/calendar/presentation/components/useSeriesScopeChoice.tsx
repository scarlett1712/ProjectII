"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { SeriesMode } from "@/shared/domain/recurringSeries";
import { ScopeChoiceModal, type ScopeChoice } from "./ScopeChoiceModal";

type ScopeAction = "save" | "delete";

interface PendingChoice {
  action: ScopeAction;
  resolve: (mode: SeriesMode | null) => void;
}

const MODE_SUFFIX: Record<SeriesMode, "One" | "Future" | "All"> = { one: "One", future: "Future", all: "All" };

/**
 * Ask whether to apply the change to one occurrence, this and later occurrences, or the entire series.
 * askScope returns the selection or null on dismissal. Render scopeModal at the end of the screen.
 */
export function useSeriesScopeChoice(itemKind: "task" | "event" = "task") {
  const t = useTranslations("calendar.confirmModal");
  const [pending, setPending] = useState<PendingChoice | null>(null);

  const settle = (mode: SeriesMode | null) => {
    pending?.resolve(mode);
    setPending(null);
  };

  const askScope = (action: ScopeAction) =>
    new Promise<SeriesMode | null>((resolve) => {
      pending?.resolve(null);
      setPending({ action, resolve });
    });

  const action = pending?.action ?? "save";
  const choices: ScopeChoice[] = (["one", "future", "all"] as const).map((mode) => ({
    key: mode,
    label: t(`${action}${MODE_SUFFIX[mode]}`),
    variant: mode !== "all" ? "secondary" : action === "delete" ? "danger" : "primary",
    onSelect: () => settle(mode),
  }));

  const item = itemKind === "task" ? t("itemTask") : t("itemEvent");
  const scopeModal = (
    <ScopeChoiceModal
      open={pending !== null}
      onClose={() => settle(null)}
      title={action === "delete" ? t("deleteTitle", { item }) : t("saveTitle")}
      message={action === "delete" ? t("deleteRecurringMessage") : t("saveMessage")}
      choices={choices}
    />
  );

  return { askScope, scopeModal };
}
