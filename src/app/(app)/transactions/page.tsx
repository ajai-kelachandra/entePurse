"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { useData } from "@/lib/data";
import { useTxnModal } from "@/components/Shell";
import { TxnRow } from "@/components/TxnRow";
import { Empty, PageHeader } from "@/components/ui";
import { ALL_CATEGORIES, PAYMENT_METHODS } from "@/lib/types";
import { money } from "@/lib/format";
import { parseYmd } from "@/lib/dates";

export default function Transactions() {
  const { transactions, deleteTransaction } = useData();
  const openModal = useTxnModal();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [method, setMethod] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "high" | "low">("newest");

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = transactions.filter((t) =>
      (!cat || t.category === cat) && (!method || t.method === method) && (!type || t.type === type) &&
      (!from || t.date >= from) && (!to || t.date <= to) &&
      (!needle || `${t.note} ${t.category} ${t.tags.join(" ")}`.toLowerCase().includes(needle)));

    if (sort === "high" || sort === "low") {
      list.sort((a, b) => (sort === "high" ? b.amount - a.amount : a.amount - b.amount));
      return [{ date: "", items: list, total: 0 }];
    }
    list.sort((a, b) => (sort === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
    const map = new Map<string, typeof list>();
    for (const t of list) map.set(t.date, [...(map.get(t.date) ?? []), t]);
    return [...map.entries()].map(([date, items]) => ({
      date, items, total: items.reduce((s, t) => s + (t.type === "expense" ? -t.amount : t.amount), 0),
    }));
  }, [transactions, q, cat, method, type, from, to, sort]);

  const count = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div>
      <PageHeader title="Transactions" subtitle={`${count} shown`} />
      <div className="card mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted" />
          <input className="input !pl-9" placeholder="Search note, category or tag" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
            <option value="">All types</option><option value="expense">Expense</option><option value="income">Income</option>
          </select>
          <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="">All categories</option>{ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
            <option value="">All methods</option>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
            <option value="high">Amount: high to low</option><option value="low">Amount: low to high</option>
          </select>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        </div>
      </div>

      {count === 0 ? <Empty>No transactions match.</Empty> : groups.map((g) => (
        <section key={g.date || "all"} className="card mb-3 !p-4">
          {g.date && (
            <div className="mb-1 flex justify-between text-xs font-medium text-muted">
              <span>{format(parseYmd(g.date), "EEE, d MMM yyyy")}</span>
              <span className="tabular-nums">{g.total < 0 ? "-" : "+"}{money(Math.abs(g.total))}</span>
            </div>
          )}
          <div className="divide-y divide-line">
            {g.items.map((t) => (
              <TxnRow
                key={t.id} t={t} onEdit={() => openModal(t)}
                onDelete={() => { if (confirm(t.commitmentId ? "Delete this EMI payment? The loan's paid count will go down by one." : "Delete this transaction?")) deleteTransaction(t.id); }}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
