export type Tag = {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
};

export type CalendarItem = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  tagId?: string | null;
  color?: string | null;
  notification: boolean;
  noteColor?: string | null;
  recurrence?: string | null;
  recurrenceEnd?: string | null;
  isRecurringInstance?: boolean;
  originalId?: string;
  completed?: boolean;
  isTask?: boolean; // UI flag to differentiate
  dueAt?: string | null;
};
