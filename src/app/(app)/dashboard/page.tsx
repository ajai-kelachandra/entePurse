"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CalendarClock, Lightbulb, Plus, Landmark, PiggyBank, Target } from "lucide-react";
import { useTxnModal } from "@/components/Shell";
import { HeroCard } from "@/components/HeroCard";
import { useData } from "@/lib/data";
import { byCategory, insights, monthStats, salaryFor, upcoming } from "@/lib/calc";
import { money, pct } from "@/lib/format";
import { cycleBounds, cycleKey, cycleLabel } from "@/lib/dates";
import { differenceInCalendarDays } from "date-fns";
import { parseYmd } from "@/lib/dates";
import { colorFor, Empty, Stat, toneText } from "@/components/ui";
import { TxnRow } from "@/components/TxnRow";
import clsx from "clsx";

function Ring({ value, tone, children }: { value: number; tone: "good" | "warn" | "bad"; children: React.ReactNode }) {
  const r = 52, c = 2 * Math.PI * r;
  const stroke = { good: "rgb(var(--good))", warn: "rgb(var(--warn))", bad: "rgb(var(--bad))" }[tone];
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 128 128" className="-rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgb(var(--subtle))" strokeWidth="12" />
        <motion.circle
          cx="64" cy="64" r={r} fill="none" stroke={stroke} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(value, 1)) }} transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const { profile, commitments, transactions, budgets } = useData();
  const month = cycleKey(profile.salaryDay);
  const openAdd = useTxnModal();
  const st = useMemo(() => monthStats(profile, commitments, transactions), [profile, commitments, transactions]);
  const cats = useMemo(() => byCategory(transactions, month, profile.salaryDay), [transactions, month, profile.salaryDay]);
  const ups = useMemo(() => upcoming(commitments, transactions), [commitments, transactions]);
  const tips = useMemo(() => insights(profile, commitments, transactions, budgets), [profile, commitments, transactions, budgets]);

  const daily = useMemo(() => {
    const { startDate } = cycleBounds(month, profile.salaryDay);
    const elapsed = differenceInCalendarDays(new Date(), startDate) + 1;
    const arr = Array.from({ length: elapsed }, (_, i) => ({ day: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i).getDate(), amount: 0 }));
    for (const t of st.inMonth) if (t.type === "expense" && !t.commitmentId) {
      const i = differenceInCalendarDays(parseYmd(t.date), startDate);
      if (arr[i]) arr[i].amount += t.amount;
    }
    return arr;
  }, [st.inMonth, month, profile.salaryDay]);

  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Hello{profile.name ? ` ${profile.name.split(" ")[0]}` : ""}!</h1>
        <p className="text-xs text-muted">Let&apos;s save your money. Pay cycle {cycleLabel(month, profile.salaryDay)}</p>
      </header>

      <HeroCard
        yellowRight={st.cashMode ? `In hand ${money(st.cash)}` : `Salary ${money(salaryFor(profile, month))} · Save ${money(st.reserve)}`}
        purpleRight={st.cashMode ? `Bills due ${money(st.pending)}` : `Fixed ${money(st.fixed)}`}
        label="Balance" amount={money(st.balance)}
        sideLabel="Safe per day" sideValue={money(st.safeToday)}
        bottomLabel={`Days left · ${st.daysLeft}`} bottomValue={`After bills ${money(st.remaining)}`}
        progress={st.used} onAdd={() => openAdd()}
      />
     

      <div className="card mx-auto grid max-w-xl grid-cols-4 gap-2 !p-4">
        {[
          { label: "Add", icon: Plus, onClick: () => openAdd() },
          { label: "EMIs", icon: Landmark, href: "/commitments" },
          { label: "Budgets", icon: PiggyBank, href: "/budgets" },
          { label: "Goals", icon: Target, href: "/goals" },
        ].map(({ label, icon: Icon, href, onClick }) => {
          const inner = (<><span className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle"><Icon className="h-5 w-5" /></span><span className="text-xs text-muted">{label}</span></>);
          return href ? <Link key={label} href={href} className="flex flex-col items-center gap-1.5">{inner}</Link>
            : <button key={label} onClick={onClick} className="flex flex-col items-center gap-1.5">{inner}</button>;
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="card flex items-center gap-5 md:col-span-3">
          <Ring value={st.used} tone={st.state}>
            <span className={clsx("text-2xl font-semibold", toneText[st.state])}>{pct(st.used * 100)}</span>
            <span className="text-[11px] text-muted">of budget used</span>
          </Ring>
          <div>
            <p className="text-xs font-medium text-muted">Safe to spend today</p>
            <p className="text-3xl font-semibold tabular-nums">{money(st.safeToday)}</p>
            <p className="mt-1 text-xs text-muted">{money(Math.max(st.remaining, 0))} left · {st.daysLeft} days to go</p>
            {st.remaining < 0 && <p className="mt-1 text-xs text-bad">Over budget by {money(-st.remaining)}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:col-span-2">
          <Stat label="Salary" value={money(profile.salary)} />
          <Stat label="Fixed deductions" value={money(st.fixed)} />
          <Stat label="Spent this month" value={money(st.spent)} />
          <Stat label="Savings" value={money(st.savings)} tone={st.savings >= 0 ? "good" : "bad"} sub={`${pct(st.savingsRate * 100)} of income`} />
        </div>
      </div>

      {tips.length > 0 && (
        <div className="card space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="h-4 w-4 text-warn" />Insights</h2>
          {tips.slice(0, 4).map((t, i) => (
            <p key={i} className="flex gap-2 text-sm"><span className={clsx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", { good: "bg-good", warn: "bg-warn", bad: "bg-bad", info: "bg-brand" }[t.tone])} />{t.text}</p>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold">Spending by category</h2>
          {cats.length === 0 ? <Empty>No spending yet this month.</Empty> : (
            <div className="flex items-center gap-4">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={cats} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
                      {cats.map((c) => <Cell key={c.name} fill={colorFor(c.name)} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid rgb(var(--line))", background: "rgb(var(--surface))", color: "rgb(var(--ink))" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 flex-1 space-y-1 text-xs">
                {cats.slice(0, 6).map((c) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: colorFor(c.name) }} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums text-muted">{money(c.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-2 text-sm font-semibold">Daily spending</h2>
          <div className="h-40">
            <ResponsiveContainer>
              <AreaChart data={daily} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} stroke="rgb(var(--muted))" interval="preserveStartEnd" />
                <Tooltip formatter={(v) => money(Number(v))} labelFormatter={(d) => `Day ${d}`} contentStyle={{ borderRadius: 12, border: "1px solid rgb(var(--line))", background: "rgb(var(--surface))", color: "rgb(var(--ink))" }} />
                <Area type="monotone" dataKey="amount" stroke="rgb(var(--brand))" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4" />Upcoming</h2>
            <Link href="/commitments" className="text-xs text-brand">Manage</Link>
          </div>
          {ups.length === 0 ? <Empty>No active commitments.</Empty> : ups.map(({ c, due, inDays, paid }) => (
            <div key={c.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted">{format(due, "d MMM")} · {paid ? "paid this month" : inDays === 0 ? "due today" : `in ${inDays} day${inDays > 1 ? "s" : ""}`}</p>
              </div>
              <span className={clsx("tabular-nums", !paid && inDays <= 3 && "font-semibold text-warn")}>{money(c.amount)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Manage expenses</h2>
            <Link href="/transactions" className="text-xs text-brand">View all</Link>
          </div>
          {recent.length === 0 ? <Empty>Tap + to add your first transaction.</Empty> : (
            <div className="divide-y divide-line">{recent.map((t) => <TxnRow key={t.id} t={t} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
