import { Budget, Commitment, Profile, Transaction } from "./types";
import { addMonths, cycleBounds, cycleKey, daysLeftInCycle, inCycle, nextOccurrence, ym, ymd } from "./dates";
import { differenceInCalendarDays } from "date-fns";

export type Tone = "good" | "warn" | "bad" | "info";

export const salaryFor = (p: Profile, key: string) => p.salaryHistory?.[key] ?? p.salary;

export const carryFor = (p: Profile, key: string) => p.carryOver?.[key] ?? 0;

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const isFinished = (c: Commitment) => c.tenure > 0 && c.paid >= c.tenure;
export const activeCommitments = (cs: Commitment[]) => cs.filter((c) => !c.paused && !isFinished(c));
export const fixedTotal = (cs: Commitment[]) => sum(activeCommitments(cs).map((c) => c.amount));

export function loanInfo(c: Commitment) {
  const remaining = c.tenure > 0 ? Math.max(c.tenure - c.paid, 0) : 0;
  // If this month's installment is already paid, the last one falls one month later.
  const endMonth = c.tenure > 0 && remaining > 0 ? addMonths(ym(new Date()), remaining - 1) : null;
  return { remaining, endMonth, progress: c.tenure > 0 ? Math.min(c.paid / c.tenure, 1) : 0 };
}

export function isPaidThisMonth(c: Commitment, txns: Transaction[], month = ym(new Date())) {
  return txns.some((t) => t.commitmentId === c.id && t.commitmentMonth === month);
}

/**
 * Money model: spendable = salary + extra income - active fixed commitments.
 * "spent" counts only discretionary expenses; commitment payments are already
 * deducted via the fixed total, so they are excluded to avoid double counting.
 */
export function monthStats(profile: Profile, cs: Commitment[], txns: Transaction[], month = cycleKey(profile.salaryDay)) {
  const inMonth = txns.filter((t) => inCycle(t.date, month, profile.salaryDay));
  const expenses = inMonth.filter((t) => t.type === "expense");
  const spent = sum(expenses.filter((t) => !t.commitmentId).map((t) => t.amount));
  const extraIncome = sum(inMonth.filter((t) => t.type === "income" && t.category !== "Salary").map((t) => t.amount));
  const fixed = fixedTotal(cs);
  const income = salaryFor(profile, month) + carryFor(profile, month) + extraIncome;
  const reserve = Math.max(profile.savingsTarget || 0, 0);
  const spendable = income - fixed - reserve; // the savings target is set aside first
  const remaining = spendable - spent;
  const isCurrent = month === cycleKey(profile.salaryDay);
  const daysLeft = isCurrent ? daysLeftInCycle(profile.salaryDay) : 1;
  const used = spendable > 0 ? spent / spendable : spent > 0 ? 1 : 0;
  const savings = income - fixed - spent;

  // Cash mode: when you've told us your real balance (taken in this cycle), safe-to-spend is based on
  // that cash minus everything spent since, minus bills still due before the next salary.
  const { startDate, endDate } = cycleBounds(month, profile.salaryDay);
  const snap = profile.cashInHand;
  const cashMode = isCurrent && !!snap && snap.asOf >= ymd(startDate);
  let cash = 0, pending = 0, cashSpent = 0, cashRemaining = 0;
  if (cashMode && snap) {
    cash = snap.amount;
    cashSpent = sum(expenses.filter((t) => t.date >= snap.asOf).map((t) => t.amount));
    pending = sum(upcoming(cs, txns).filter((u) => !u.paid && u.due < endDate).map((u) => u.c.amount));
    cashRemaining = cash - cashSpent - pending;
  }
  const effRemaining = cashMode ? cashRemaining : remaining;
  const effUsed = cashMode ? (cash > 0 ? (cashSpent + pending) / cash : 1) : used;
  return {
    inMonth, income, fixed, reserve, spendable, spent, used: effUsed, daysLeft, savings,
    remaining: effRemaining, cashMode, cash, pending,
    balance: cashMode ? cash - cashSpent : effRemaining,
    safeToday: Math.max(effRemaining, 0) / daysLeft,
    savingsRate: income > 0 ? savings / income : 0,
    state: (effUsed >= 1 ? "bad" : effUsed >= 0.8 ? "warn" : "good") as "good" | "warn" | "bad",
  };
}

export function byCategory(txns: Transaction[], month: string, salaryDay: number) {
  const m = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "expense" || !inCycle(t.date, month, salaryDay) || t.commitmentId) continue;
    m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
  }
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function upcoming(cs: Commitment[], txns: Transaction[]) {
  const now = new Date();
  const month = ym(now);
  return activeCommitments(cs)
    .map((c) => {
      const paid = isPaidThisMonth(c, txns, month);
      const from = paid ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : now;
      const due = nextOccurrence(c.dueDay, from);
      return { c, paid, due, inDays: differenceInCalendarDays(due, now) };
    })
    .sort((a, b) => a.inDays - b.inDays);
}

export function insights(profile: Profile, cs: Commitment[], txns: Transaction[], budgets: Budget[]): { tone: Tone; text: string }[] {
  const out: { tone: Tone; text: string }[] = [];
  const st = monthStats(profile, cs, txns);
  const month = cycleKey(profile.salaryDay);
  const share = profile.salary > 0 ? (st.fixed / profile.salary) * 100 : 0;
  if (share > 50) out.push({ tone: "bad", text: `Fixed commitments take ${Math.round(share)}% of your salary. Aim to stay under 40%.` });
  else if (share > 40) out.push({ tone: "warn", text: `Fixed commitments are ${Math.round(share)}% of your salary, which is on the high side.` });
  else if (share > 0) out.push({ tone: "info", text: `Fixed commitments are ${Math.round(share)}% of your salary.` });

  const cats = byCategory(txns, month, profile.salaryDay);
  for (const b of budgets) {
    const spent = cats.find((c) => c.name === b.category)?.value ?? 0;
    const u = b.limit > 0 ? spent / b.limit : 0;
    if (u >= 1) out.push({ tone: "bad", text: `${b.category} budget exceeded: ${Math.round(u * 100)}% used.` });
    else if (u >= 0.7) out.push({ tone: "warn", text: `You've used ${Math.round(u * 100)}% of your ${b.category} budget with ${st.daysLeft} days left.` });
  }
  if (st.used >= 1) out.push({ tone: "bad", text: "You've spent your entire spendable balance for this month." });
  else if (st.spendable > 0 && st.used < 0.5 && st.daysLeft <= 10) out.push({ tone: "good", text: "You're well under budget this month. Consider moving the surplus to savings." });
  if (profile.savingsTarget > 0) {
    if (st.savings >= profile.savingsTarget) out.push({ tone: "good", text: "You're on track to hit your monthly savings target." });
    else out.push({ tone: "warn", text: `You're ₹${Math.round(profile.savingsTarget - st.savings).toLocaleString("en-IN")} short of your monthly savings target.` });
  }
  const top = cats[0];
  if (top && st.spent > 0) out.push({ tone: "info", text: `${top.name} is your top spending category at ${Math.round((top.value / st.spent) * 100)}% of spend.` });
  for (const u of upcoming(cs, txns).filter((x) => !x.paid && x.inDays <= 3))
    out.push({ tone: "warn", text: `${u.c.name} is due ${u.inDays === 0 ? "today" : `in ${u.inDays} day${u.inDays > 1 ? "s" : ""}`}.` });
  return out;
}
