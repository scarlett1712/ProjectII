export type Account = {
  id: string;
  name: string;
  balance: number;
  color: string;
  startingBalance?: number;
};

export type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string;
};

export type Goal = {
  id: string;
  categoryId: string;
  amount: number;
  year: number;
  month: number;
};

export type Transaction = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  categoryId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  note: string | null;
  occurredAt: string;
  category?: Category | null;
  fromAccount?: Account | null;
  toAccount?: Account | null;
};

export type TransactionType = Transaction["type"];
