export type PaymentMethod = "UPI" | "Cash" | "Card" | "Bank";
export const PAYMENT_METHODS: PaymentMethod[] = ["UPI", "Cash", "Card", "Bank"];

export const EXPENSE_CATEGORIES = [
  "Food", "Fuel", "Groceries", "Shopping", "Bills", "Travel", "Health", "Entertainment", "Others",
] as const;
export const INCOME_CATEGORIES = ["Salary", "Bonus", "Freelance", "Interest", "Other income"] as const;
export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, "EMI", ...INCOME_CATEGORIES] as string[];

export interface Profile {
  name: string;
  salary: number;
  salaryDay: number;
  savingsTarget: number; // monthly, 0 = none
  onboarded: boolean;
  salaryHistory?: Record<string, number>; // pay-cycle key (yyyy-MM) -> salary actually received
  carryOver?: Record<string, number>; // pay-cycle key -> cash left over from the previous cycle
  cashInHand?: { amount: number; asOf: string }; // real balance snapshot (yyyy-MM-dd); drives safe-to-spend
}

export interface Transaction {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  date: string; // yyyy-MM-dd
  method: PaymentMethod;
  note: string;
  tags: string[];
  commitmentId?: string;
  commitmentMonth?: string; // yyyy-MM
}

export interface Commitment {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  kind: "loan" | "bill"; // loan has a tenure; bill is open-ended (LIC, rent, SIP)
  tenure: number; // total installments (0 = open-ended)
  paid: number; // installments paid so far
  paused: boolean;
}

export interface Budget { id: string; category: string; limit: number }

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string; // yyyy-MM-dd
}
