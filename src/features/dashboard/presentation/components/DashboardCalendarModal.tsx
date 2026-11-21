"use client";

import { useTranslations } from "next-intl";
import type { ScheduleItemDraft } from "@/features/calendar/domain/scheduleItemPayload";
import type { Tag } from "@/features/calendar/presentation/types";
import type { ScheduleDraftChange } from "@/features/calendar/presentation/scheduleItemForm";
import { ScheduleItemFields } from "@/features/calendar/presentation/components/ScheduleItemFields";
import { Button, Modal } from "@/shared/ui/components";

interface DashboardCalendarModalProps {
  open: boolean;
  values: ScheduleItemDraft;
  onChange: ScheduleDraftChange;
  tags: Tag[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

/** Create an event or task from Dashboard. This form handles creation only. */
export function DashboardCalendarModal({
  open,
  values,
  onChange,
  tags,
  isSubmitting,
  onSubmit,
  onClose,
}: DashboardCalendarModalProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  return (
    <Modal open={open} onClose={onClose} title={tc("schedule.createTitle")} size="lg">
      <form onSubmit={onSubmit} className="space-y-5">
        <ScheduleItemFields values={values} onChange={onChange} tags={tags} showTypeToggle showCompleted={false} />

        <Button type="submit" size="lg" fullWidth loading={isSubmitting} loadingText={tc("action.saving")}>
          {t("calendarModal.save")}
        </Button>
      </form>
    </Modal>
  );
}
