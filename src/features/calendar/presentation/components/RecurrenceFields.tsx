"use client";

import { useTranslations } from "next-intl";
import { Field, Select } from "@/shared/ui/components";
import { DateTimeInput } from "./DateTimeInput";

interface RecurrenceFieldsProps {
  recurrence: string;
  onRecurrenceChange: (value: string) => void;
  recurrenceEnd: string;
  onRecurrenceEndChange: (value: string) => void;
}

/** Local date-time value at 23:59 one month from today. */
function defaultRecurrenceEnd(): string {
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  end.setHours(23, 59, 0, 0);
  const local = new Date(end.getTime() - end.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

/**
 * Choose a recurrence and its end time. The first selection suggests an end date one month later.
 * Move a midnight end time to 23:59 to include the entire final day.
 */
export function RecurrenceFields({
  recurrence,
  onRecurrenceChange,
  recurrenceEnd,
  onRecurrenceEndChange,
}: RecurrenceFieldsProps) {
  const tc = useTranslations("common");

  return (
    <>
      <Field label={tc("schedule.repeat")}>
        <Select
          value={recurrence}
          onChange={(e) => {
            const val = e.target.value;
            onRecurrenceChange(val);
            if (val !== "NONE" && !recurrenceEnd) onRecurrenceEndChange(defaultRecurrenceEnd());
          }}
          className="block"
        >
          <option value="NONE">{tc("schedule.repeatNone")}</option>
          <option value="DAILY">{tc("schedule.repeatDaily")}</option>
          <option value="WEEKLY">{tc("schedule.repeatWeekly")}</option>
          <option value="MONTHLY">{tc("schedule.repeatMonthly")}</option>
        </Select>
      </Field>

      {recurrence !== "NONE" && (
        <Field label={tc("schedule.repeatEnd")} className="w-full min-w-0">
          <DateTimeInput
            value={recurrenceEnd}
            onChange={(e) => {
              let val = e.target.value;
              if (val && val.includes("T")) {
                const [date, time] = val.split("T");
                if (time === "00:00") val = `${date}T23:59`;
              }
              onRecurrenceEndChange(val);
            }}
          />
        </Field>
      )}
    </>
  );
}
