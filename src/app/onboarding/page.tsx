"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DEFAULT_COMMITMENTS, useData } from "@/lib/data";
import { money } from "@/lib/format";
import { Field, Spinner } from "@/components/ui";

const schema = z.object({
  salary: z.number({ error: "Enter your salary" }).positive("Must be above 0"),
  salaryDay: z.number({ error: "Required" }).int().min(1).max(31),
  savingsTarget: z.number().min(0),
  commitments: z.array(z.object({
    name: z.string().min(1, "Name required"),
    amount: z.number({ error: "Required" }).positive(),
    dueDay: z.number({ error: "Required" }).int().min(1).max(31),
    tenure: z.number().int().min(0),
    paid: z.number().int().min(0),
  })),
});
type Form = z.infer<typeof schema>;

export default function Onboarding() {
  const { user, loading } = useAuth();
  const { ready, profile, completeOnboarding } = useData();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      salary: 50000, salaryDay: 25, savingsTarget: 10000,
      commitments: DEFAULT_COMMITMENTS.map(({ name, amount, dueDay, tenure, paid }) => ({ name, amount, dueDay, tenure, paid })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "commitments" });
  const w = watch();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (ready && profile.onboarded) router.replace("/dashboard");
  }, [loading, user, ready, profile.onboarded, router]);

  if (!ready) return <Spinner />;

  const fixed = (w.commitments ?? []).reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const submit = handleSubmit(async (v) => {
    setSaving(true);
    await completeOnboarding(
      { name: user?.displayName ?? "", salary: v.salary, salaryDay: v.salaryDay, savingsTarget: v.savingsTarget, onboarded: true },
      v.commitments.map((c) => ({ ...c, kind: c.tenure > 0 ? "loan" as const : "bill" as const, paused: false })),
    );
    router.replace("/dashboard");
  });

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-2xl font-semibold">Let's set up your money</h1>
      <p className="mb-6 text-sm text-muted">You can change everything later in Settings.</p>
      <form onSubmit={submit} className="space-y-5">
        <section className="card grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Monthly salary (₹)" error={errors.salary?.message}>
            <input className="input" type="number" inputMode="numeric" {...register("salary", { valueAsNumber: true })} />
          </Field></div>
          <Field label="Salary credit day" error={errors.salaryDay?.message}>
            <input className="input" type="number" {...register("salaryDay", { valueAsNumber: true })} />
          </Field>
          <Field label="Save every month (₹)">
            <input className="input" type="number" {...register("savingsTarget", { valueAsNumber: true })} />
          </Field>
        </section>

        <section className="card space-y-4">
          <h2 className="font-medium">Fixed monthly commitments</h2>
          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-6 gap-2 rounded-xl bg-subtle p-3">
              <div className="col-span-5"><input className="input" placeholder="Name" {...register(`commitments.${i}.name`)} /></div>
              <button type="button" aria-label="Remove" className="flex items-center justify-center text-bad" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></button>
              <div className="col-span-2"><label className="label">Amount</label><input className="input" type="number" {...register(`commitments.${i}.amount`, { valueAsNumber: true })} /></div>
              <div className="col-span-1"><label className="label">Due day</label><input className="input" type="number" {...register(`commitments.${i}.dueDay`, { valueAsNumber: true })} /></div>
              <div className="col-span-1"><label className="label">Tenure</label><input className="input" type="number" {...register(`commitments.${i}.tenure`, { valueAsNumber: true })} /></div>
              <div className="col-span-2"><label className="label">Paid so far</label><input className="input" type="number" {...register(`commitments.${i}.paid`, { valueAsNumber: true })} /></div>
            </div>
          ))}
          <p className="text-xs text-muted">Tenure = total installments; use 0 for open-ended items like insurance or rent.</p>
          <button type="button" className="btn-ghost" onClick={() => append({ name: "", amount: 0, dueDay: 1, tenure: 0, paid: 0 })}><Plus className="h-4 w-4" />Add commitment</button>
        </section>

        <div className="card flex justify-between text-sm">
          <span>Fixed outflow <b>{money(fixed)}</b></span>
          <span>Spendable <b className="text-good">{money((Number(w.salary) || 0) - fixed - (Number(w.savingsTarget) || 0))}</b></span>
        </div>
        <button className="btn-primary w-full" disabled={saving}>{saving ? "Saving…" : "Finish setup"}</button>
      </form>
    </main>
  );
}
