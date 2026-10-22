"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useData } from "@/lib/data";
import { byCategory, carryFor, salaryFor, sum } from "@/lib/calc";
import { money, pct } from "@/lib/format";
import { addMonths, cycleKey, cycleLabel, inCycle, parseYmd } from "@/lib/dates";
import { colorFor, PageHeader, Progress, Stat } from "@/components/ui";

const tip = { borderRadius: 12, border: "1px solid rgb(var(--line))", background: "rgb(var(--surface))", color: "rgb(var(--ink))" };

export default function Reports() {
  const { profile, transactions } = useData();
  const [month, setMonth] = useState(cycleKey(profile.salaryDay));

  /** Reports use actual recorded transactions: salary plus extra income vs everything spent, EMIs included. */
  const summarize = (m: string) => {
    const tx = transactions.filter((t) => inCycle(t.date, m, profile.salaryDay));
    const extra = sum(tx.filter((t) => t.type === "income" && t.category !== "Salary").map((t) => t.amount));
    const income = salaryFor(profile, m) + carryFor(profile, m) + extra;
    const expense = sum(tx.filter((t) => t.type === "expense").map((t) => t.amount));
    return { income, expense, savings: income - expense, count: tx.length };
  };

  const cur = summarize(month);
  const prev = summarize(addMonths(month, -1));
  const cats = useMemo(() => byCategory(transactions, month, profile.salaryDay), [transactions, month, profile.salaryDay]);
  const catTotal = sum(cats.map((c) => c.value));
  const trend = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(month, i - 5);
    const s = summarize(m);
    return { month: format(parseYmd(`${m}-01`), "MMM"), Income: s.income, Expense: s.expense };
  });
  const rate = cur.income > 0 ? (cur.savings / cur.income) * 100 : 0;
  const delta = prev.expense > 0 ? ((cur.expense - prev.expense) / prev.expense) * 100 : null;

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = transactions.filter((t) => inCycle(t.date, month, profile.salaryDay)).sort((a, b) => a.date.localeCompare(b.date));
    const csv = [["Date", "Type", "Category", "Amount", "Method", "Note", "Tags"].join(",")]
      .concat(rows.map((t) => [t.date, t.type, t.category, t.amount, t.method, t.note, t.tags.join(";")].map(esc).join(",")))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `mony-${month}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" action={<button className="btn-ghost" onClick={exportCsv}><Download className="h-4 w-4" />CSV</button>} />
      <div className="flex items-center justify-center gap-3">
        <button aria-label="Previous month" className="btn-ghost !p-2" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></button>
        <span className="w-52 text-center text-sm font-medium">{cycleLabel(month, profile.salaryDay)}</span>
        <button aria-label="Next month" className="btn-ghost !p-2" disabled={month >= cycleKey(profile.salaryDay)} onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Income" value={money(cur.income)} />
        <Stat label="Expenses" value={money(cur.expense)} sub={delta === null ? undefined : `${delta >= 0 ? "+" : ""}${Math.round(delta)}% vs last month`} tone={delta !== null && delta > 0 ? "warn" : undefined} />
        <Stat label="Saved" value={money(cur.savings)} tone={cur.savings >= 0 ? "good" : "bad"} />
        <Stat label="Savings rate" value={pct(rate)} tone={rate >= 20 ? "good" : rate >= 0 ? "warn" : "bad"} />
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold">Income vs expense, last 6 months</h2>
        <div className="h-60">
          <ResponsiveContainer>
            <BarChart data={trend}>
              <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="rgb(var(--muted))" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="rgb(var(--muted))" width={48} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => money(Number(v))} contentStyle={tip} cursor={{ fill: "rgb(var(--subtle))" }} />
              <Legend />
              <Bar dataKey="Income" fill="rgb(var(--good))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Expense" fill="rgb(var(--brand))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">Top categories (excluding EMIs)</h2>
        {cats.length === 0 && <p className="text-sm text-muted">No spending recorded for this month.</p>}
        {cats.slice(0, 6).map((c) => (
          <div key={c.name}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: colorFor(c.name) }} />{c.name}</span>
              <span className="tabular-nums text-muted">{money(c.value)} · {pct((c.value / catTotal) * 100)}</span>
            </div>
            <Progress value={c.value / catTotal} />
          </div>
        ))}
      </div>
    </div>
  );
}
