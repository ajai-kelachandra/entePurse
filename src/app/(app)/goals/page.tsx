"use client";

import { useState } from "react";
import { differenceInCalendarMonths, format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useData } from "@/lib/data";
import { money, pct } from "@/lib/format";
import { parseYmd } from "@/lib/dates";
import { Goal } from "@/lib/types";
import { Empty, Field, Modal, PageHeader, Progress } from "@/components/ui";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  target: z.number({ error: "Enter target" }).positive(),
  saved: z.number({ error: "Required" }).min(0),
  deadline: z.string().min(1, "Pick a deadline"),
});
type Form = z.infer<typeof schema>;

function GoalForm({ initial, onDone }: { initial?: Goal; onDone: () => void }) {
  const { saveGoal } = useData();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { name: "", target: undefined, saved: 0, deadline: "" },
  });
  return (
    <form onSubmit={handleSubmit(async (v) => { await saveGoal(v, initial?.id); onDone(); })} className="space-y-4">
      <Field label="Goal" error={errors.name?.message}><input className="input" placeholder="Emergency fund, Goa trip…" {...register("name")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target (₹)" error={errors.target?.message}><input className="input" type="number" {...register("target", { valueAsNumber: true })} /></Field>
        <Field label="Saved so far (₹)" error={errors.saved?.message}><input className="input" type="number" {...register("saved", { valueAsNumber: true })} /></Field>
      </div>
      <Field label="Deadline" error={errors.deadline?.message}><input className="input" type="date" {...register("deadline")} /></Field>
      <button className="btn-primary w-full" disabled={isSubmitting}>{initial ? "Save" : "Create goal"}</button>
    </form>
  );
}

export default function Goals() {
  const { goals, saveGoal, deleteGoal } = useData();
  const [editing, setEditing] = useState<{ open: boolean; g?: Goal }>({ open: false });
  const [adding, setAdding] = useState<Record<string, string>>({});

  const addFunds = async (g: Goal) => {
    const n = Number(adding[g.id]);
    if (!(n > 0)) return;
    const { id, ...rest } = g;
    await saveGoal({ ...rest, saved: g.saved + n }, id);
    setAdding((a) => ({ ...a, [g.id]: "" }));
  };

  return (
    <div>
      <PageHeader title="Savings goals" action={<button className="btn-primary" onClick={() => setEditing({ open: true })}><Plus className="h-4 w-4" />New goal</button>} />
      {goals.length === 0 && <Empty>Create a goal to see how much to save each month.</Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((g) => {
          const remaining = Math.max(g.target - g.saved, 0);
          const months = Math.max(differenceInCalendarMonths(parseYmd(g.deadline), new Date()), 0);
          const monthly = months > 0 ? remaining / months : remaining;
          const reached = remaining === 0;
          return (
            <div key={g.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{g.name}</h3>
                  <p className="text-xs text-muted">By {format(parseYmd(g.deadline), "d MMM yyyy")}</p>
                </div>
                <div className="flex gap-1">
                  <button aria-label="Edit" className="rounded-lg p-1.5 text-muted hover:bg-subtle" onClick={() => setEditing({ open: true, g })}><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Delete" className="rounded-lg p-1.5 text-muted hover:bg-bad/10 hover:text-bad" onClick={() => confirm(`Delete ${g.name}?`) && deleteGoal(g.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <Progress value={g.saved / g.target} tone={reached ? "good" : "info"} />
              <div className="flex justify-between text-sm">
                <span className="tabular-nums">{money(g.saved)} <span className="text-muted">of {money(g.target)}</span></span>
                <span className="text-muted">{pct((g.saved / g.target) * 100)}</span>
              </div>
              <p className="text-xs text-muted">
                {reached ? "Goal reached 🎉" : months === 0 ? `Deadline is this month or past: ${money(remaining)} still needed.` : `Save ${money(Math.ceil(monthly))} per month for ${months} month${months > 1 ? "s" : ""}.`}
              </p>
              {!reached && (
                <div className="flex gap-2">
                  <input className="input" type="number" placeholder="Add ₹" value={adding[g.id] ?? ""} onChange={(e) => setAdding((a) => ({ ...a, [g.id]: e.target.value }))} />
                  <button className="btn-ghost" onClick={() => addFunds(g)}>Add</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Modal open={editing.open} onClose={() => setEditing({ open: false })} title={editing.g ? "Edit goal" : "New goal"}>
        {editing.open && <GoalForm key={editing.g?.id ?? "new"} initial={editing.g} onDone={() => setEditing({ open: false })} />}
      </Modal>
    </div>
  );
}
