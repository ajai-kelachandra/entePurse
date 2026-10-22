"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useData } from "@/lib/data";
import { byCategory } from "@/lib/calc";
import { money, pct } from "@/lib/format";
import { cycleKey, cycleLabel } from "@/lib/dates";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import { colorFor, PageHeader, Progress } from "@/components/ui";

function BudgetCard({ category }: { category: string }) {
  const { budgets, transactions, profile, saveBudget, deleteBudget } = useData();
  const budget = budgets.find((b) => b.category === category);
  const spent = useMemo(() => byCategory(transactions, cycleKey(profile.salaryDay), profile.salaryDay).find((c) => c.name === category)?.value ?? 0, [transactions, category, profile.salaryDay]);
  const [draft, setDraft] = useState<string | null>(null);

  const used = budget && budget.limit > 0 ? spent / budget.limit : 0;
  const tone = used >= 1 ? "bad" : used >= 0.8 ? "warn" : "good";
  const commit = async () => {
    const n = Number(draft);
    if (draft !== null && draft !== "") {
      if (n > 0) await saveBudget(category, n);
    } else if (draft === "" && budget) await deleteBudget(budget.id);
    setDraft(null);
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(category) }} />{category}
        </div>
        <label className="flex items-center gap-1 text-sm">
          <span className="text-muted">₹</span>
          <input
            className="input !w-28 !py-1.5 text-right" type="number" placeholder="No limit" aria-label={`${category} monthly limit`}
            value={draft ?? budget?.limit ?? ""} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </label>
      </div>
      {budget ? (
        <>
          <Progress value={used} tone={tone} />
          <div className="flex justify-between text-xs text-muted">
            <span>{money(spent)} spent · {pct(used * 100)}</span>
            <span>{used >= 1 ? `${money(spent - budget.limit)} over` : `${money(budget.limit - spent)} left`}</span>
          </div>
          {used >= 0.8 && (
            <p className={`flex items-center gap-1.5 text-xs ${used >= 1 ? "text-bad" : "text-warn"}`}>
              <AlertTriangle className="h-3.5 w-3.5" />{used >= 1 ? "Limit reached. Further spending goes over budget." : "Over 80% of this budget is used."}
            </p>
          )}
        </>
      ) : <p className="text-xs text-muted">{spent > 0 ? `${money(spent)} spent this month. ` : ""}Set a limit to track it.</p>}
    </div>
  );
}

export default function Budgets() {
  const { profile } = useData();
  return (
    <div>
      <PageHeader title="Budgets" subtitle={`Pay cycle ${cycleLabel(cycleKey(profile.salaryDay), profile.salaryDay)} · alerts at 80% and 100%`} />
      <div className="grid gap-4 md:grid-cols-2">
        {EXPENSE_CATEGORIES.map((c) => <BudgetCard key={c} category={c} />)}
      </div>
    </div>
  );
}
