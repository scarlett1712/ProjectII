export interface DiaryMealBadge {
  id: string;
  mealName: string;
  grams: number;
  calories: number;
  note: string | null;
  eatenAt: string;
}

export interface DiaryTransactionBadge {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  note: string | null;
  occurredAt: string;
  category: { id: string; name: string; color: string } | null;
}

export interface DiaryPhoto {
  id: string;
  takenAt: string;
  dateKey: string;
  imageData: string;
  caption: string | null;
  mealId: string | null;
  transactionId: string | null;
  meal: DiaryMealBadge | null;
  transaction: DiaryTransactionBadge | null;
}

export interface DiaryEntry {
  id: string;
  dateKey: string;
  content: string;
  mood: string | null;
  updatedAt: string;
}

export interface DiaryMonthResponse {
  monthKey: string;
  photos: DiaryPhoto[];
  journalDateKeys: string[];
}

export interface DiaryDayResponse {
  dateKey: string;
  entry: DiaryEntry | null;
  photos: DiaryPhoto[];
}
