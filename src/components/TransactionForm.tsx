"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { useData } from "@/lib/data";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, Transaction } from "@/lib/types";
import { ymd } from "@/lib/dates";
import { Field } from "./ui";

const schema = z.object({
  amount: z.number({ error: "Enter an amount" }).positive("Must be above 0"),
  category: z.string().min(1),
  date: z.string().min(1, "Pick a date"),
  method: z.enum(PAYMENT_METHODS),
  note: z.string().max(120),
  tags: z.string(),
});
type Form = z.infer<typeof schema>;

export function TransactionForm({ initial, onDone }: { initial?: Transaction; onDone: () => void }) {
  const { addTransaction, updateTransaction } = useData();
  const [type, setType] = useState<"expense" | "income">(initial?.type ?? "expense");
  const cats: readonly string[] = type === "expense" ? (initial?.category === "EMI" ? [...EXPENSE_CATEGORIES, "EMI"] : EXPENSE_CATEGORIES) : INCOME_CATEGORIES;

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: initial?.amount, category: initial?.category ?? "Food", date: initial?.date ?? ymd(new Date()),
      method: initial?.method ?? "UPI", note: initial?.note ?? "", tags: initial?.tags.join(", ") ?? "",
    },
  });
  const category = watch("category");

  const submit = handleSubmit(async (v) => {
    const payload = {
      type, amount: v.amount, category: v.category, date: v.date, method: v.method, note: v.note.trim(),
      tags: v.tags.split(",").map((t) => t.trim()).filter(Boolean),
      ...(initial?.commitmentId ? { commitmentId: initial.commitmentId, commitmentMonth: initial.commitmentMonth } : {}),
    };
    if (initial) await updateTransaction(initial.id, payload);
    else await addTransaction(payload);
    onDone();
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-subtle p-1">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t} type="button" disabled={Boolean(initial?.commitmentId)}
            onClick={() => { setType(t); setValue("category", t === "expense" ? "Food" : "Salary"); }}
            className={clsx("rounded-lg py-2 text-sm font-medium capitalize", type === t ? "bg-surface shadow-card" : "text-muted")}
          >{t}</button>
        ))}
      </div>

      <Field label="Amount (₹)" error={errors.amount?.message}>
        <input autoFocus className="input !py-3 text-lg font-semibold" type="number" inputMode="decimal" step="any" placeholder="0" {...register("amount", { valueAsNumber: true })} />
      </Field>

      <div>
        <label className="label">Category</label>
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c} type="button" onClick={() => setValue("category", c)}
              className={clsx("rounded-full border px-3 py-1 text-xs", category === c ? "border-brand bg-brand/10 text-brand" : "border-line text-muted")}
            >{c}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" error={errors.date?.message}><input className="input" type="date" {...register("date")} /></Field>
        <Field label="Payment method">
          <select className="input" {...register("method")}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
        </Field>
      </div>
      <Field label="Note"><input className="input" placeholder="What was this for?" {...register("note")} /></Field>
      <Field label="Tags (comma separated)"><input className="input" placeholder="trip, office" {...register("tags")} /></Field>
      <button className="btn-primary w-full" disabled={isSubmitting}>{initial ? "Save changes" : "Add transaction"}</button>
    </form>
  );
}
