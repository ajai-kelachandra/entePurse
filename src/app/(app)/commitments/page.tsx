"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Pause, Pencil, Play, Plus, Trash2, Undo2 } from "lucide-react";
import { useData } from "@/lib/data";
import { isFinished, isPaidThisMonth, loanInfo, fixedTotal } from "@/lib/calc";
import { money } from "@/lib/format";
import { parseYmd } from "@/lib/dates";
import { Commitment } from "@/lib/types";
import { Empty, Field, Modal, PageHeader, Progress } from "@/components/ui";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  amount: z.number({ error: "Enter amount" }).positive(),
  dueDay: z.number({ error: "Required" }).int().min(1).max(31),
  tenure: z.number({ error: "Required" }).int().min(0),
  paid: z.number({ error: "Required" }).int().min(0),
});
type Form = z.infer<typeof schema>;

function CommitmentForm({ initial, onDone }: { initial?: Commitment; onDone: () => void }) {
  const { saveCommitment } = useData();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { name: "", amount: undefined, dueDay: 1, tenure: 0, paid: 0 },
  });
  const submit = handleSubmit(async (v) => {
    await saveCommitment(
      { ...v, paid: v.tenure > 0 ? Math.min(v.paid, v.tenure) : 0, kind: v.tenure > 0 ? "loan" : "bill", paused: initial?.paused ?? false },
      initial?.id,
    );
    onDone();
  });
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" error={errors.name?.message}><input className="input" placeholder="Rent, SIP, Home loan…" {...register("name")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)" error={errors.amount?.message}><input className="input" type="number" {...register("amount", { valueAsNumber: true })} /></Field>
        <Field label="Due day of month" error={errors.dueDay?.message}><input className="input" type="number" {...register("dueDay", { valueAsNumber: true })} /></Field>
        <Field label="Total installments" error={errors.tenure?.message}><input className="input" type="number" {...register("tenure", { valueAsNumber: true })} /></Field>
        <Field label="Installments paid" error={errors.paid?.message}><input className="input" type="number" {...register("paid", { valueAsNumber: true })} /></Field>
      </div>
      <p className="text-xs text-muted">Use 0 installments for open-ended items (insurance, rent, SIP).</p>
      <button className="btn-primary w-full" disabled={isSubmitting}>{initial ? "Save" : "Add commitment"}</button>
    </form>
  );
}

export default function Commitments() {
  const { commitments, transactions, markPaid, unmarkPaid, saveCommitment, deleteCommitment } = useData();
  const [editing, setEditing] = useState<{ open: boolean; c?: Commitment }>({ open: false });

  return (
    <div>
      <PageHeader
        title="EMIs & Loans" subtitle={`${money(fixedTotal(commitments))} per month across active items`}
        action={<button className="btn-primary" onClick={() => setEditing({ open: true })}><Plus className="h-4 w-4" />Add</button>}
      />
      {commitments.length === 0 && <Empty>No commitments yet.</Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {commitments.map((c) => {
          const info = loanInfo(c);
          const paid = isPaidThisMonth(c, transactions);
          const done = isFinished(c);
          return (
            <div key={c.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-muted">Due on the {c.dueDay}{["th", "st", "nd", "rd"][c.dueDay % 10 > 3 || [11, 12, 13].includes(c.dueDay) ? 0 : c.dueDay % 10]} of each month</p>
                </div>
                <p className="text-lg font-semibold tabular-nums">{money(c.amount)}</p>
              </div>

              {c.tenure > 0 && (
                <>
                  <Progress value={info.progress} tone={done ? "good" : "info"} />
                  <div className="flex justify-between text-xs text-muted">
                    <span>{c.paid} of {c.tenure} paid</span>
                    <span>{done ? "Loan closed 🎉" : `${info.remaining} left${info.endMonth ? ` · ends ${format(parseYmd(`${info.endMonth}-01`), "MMM yyyy")}` : ""}`}</span>
                  </div>
                </>
              )}

              <div className="flex flex-wrap gap-2">
                {!done && !c.paused && (paid ? (
                  <button className="btn-ghost !px-3 !py-1.5" onClick={() => unmarkPaid(c)}><Undo2 className="h-3.5 w-3.5" />Paid this month · undo</button>
                ) : (
                  <button className="btn-primary !px-3 !py-1.5" onClick={() => markPaid(c)}><Check className="h-3.5 w-3.5" />Mark as paid this month</button>
                ))}
                {!done && (
                  <button className="btn-ghost !px-3 !py-1.5" onClick={() => saveCommitment({ ...(({ id, ...rest }) => rest)(c), paused: !c.paused }, c.id)}>
                    {c.paused ? <><Play className="h-3.5 w-3.5" />Resume</> : <><Pause className="h-3.5 w-3.5" />Pause</>}
                  </button>
                )}
                <button className="btn-ghost !px-3 !py-1.5" onClick={() => setEditing({ open: true, c })}><Pencil className="h-3.5 w-3.5" />Edit</button>
                <button className="btn-danger !px-3 !py-1.5" onClick={() => confirm(`Delete ${c.name}?`) && deleteCommitment(c.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              {c.paused && <p className="text-xs text-warn">Paused: not counted in your monthly fixed outflow.</p>}
            </div>
          );
        })}
      </div>
      <Modal open={editing.open} onClose={() => setEditing({ open: false })} title={editing.c ? "Edit commitment" : "New commitment"}>
        {editing.open && <CommitmentForm key={editing.c?.id ?? "new"} initial={editing.c} onDone={() => setEditing({ open: false })} />}
      </Modal>
    </div>
  );
}
