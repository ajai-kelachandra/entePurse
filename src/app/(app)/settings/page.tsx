"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data";
import { Field, PageHeader } from "@/components/ui";
import { carryFor, salaryFor } from "@/lib/calc";
import { addMonths, cycleKey, cycleLabel, ymd } from "@/lib/dates";
import { deleteField as fsDeleteField } from "firebase/firestore";

const schema = z.object({
  name: z.string().max(60),
  salary: z.number({ error: "Enter salary" }).positive(),
  salaryDay: z.number({ error: "Required" }).int().min(1).max(31),
  savingsTarget: z.number({ error: "Required" }).min(0),
});
type Form = z.infer<typeof schema>;

/** Salary actually received per pay cycle; falls back to the default monthly salary when not set. */
function SalaryByCycle() {
  const { profile, saveProfile } = useData();
  const cur = cycleKey(profile.salaryDay);
  const deleteField = () => saveProfile({ cashInHand: fsDeleteField() as never });
  const last = addMonths(cur, -1);
  const [vals, setVals] = useState<Record<string, string>>({
    [last]: String(salaryFor(profile, last)),
    [cur]: String(salaryFor(profile, cur)),
  });
  const [done, setDone] = useState(false);
  const [day, setDay] = useState(profile.salaryDay);
  const [cashMsg, setCashMsg] = useState("");
  const [cash, setCash] = useState(profile.cashInHand ? String(profile.cashInHand.amount) : "");
  const [carry, setCarry] = useState(String(carryFor(profile, cur) || ""));

  const save = async () => {
    const salaryHistory = { ...(profile.salaryHistory ?? {}) };
    for (const k of [last, cur]) {
      const n = Number(vals[k]);
      if (n > 0) salaryHistory[k] = n;
    }
    const carryOver = { ...(profile.carryOver ?? {}) };
    carryOver[cur] = Math.max(Number(carry) || 0, 0);
    await saveProfile({ salaryHistory, carryOver });
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <section className="card mt-4 space-y-4">
      <div>
        <h2 className="font-medium">Salary by pay cycle</h2>
        <p className="text-xs text-muted">Your pay cycle runs from one salary date to the day before the next.</p>
      </div>
      <div className="flex items-end gap-2 rounded-xl bg-subtle p-3">
        <div className="flex-1">
          <label className="label">Salary date (day of every month)</label>
          <select className="input" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button className="btn-primary" disabled={day === profile.salaryDay} onClick={() => saveProfile({ salaryDay: day })}>Update date</button>
      </div>
      {[last, cur].map((k) => (
        <Field key={k} label={`${k === cur ? "This cycle" : "Last cycle"} · ${cycleLabel(k, profile.salaryDay)} (₹)`}>
          <input className="input" type="number" value={vals[k] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
        </Field>
      ))}
      <div className="space-y-2 rounded-xl bg-subtle p-3">
        <label className="label">Cash in hand right now (₹)</label>
        <p className="text-xs text-muted">Your real balance today. Safe to spend is then this cash, minus bills due before payday, divided by the days left. It resets when your next salary date starts.</p>
        <div className="flex gap-2">
          <input className="input" type="number" placeholder="e.g. 1000" value={cash} onChange={(e) => setCash(e.target.value)} />
          <button className="btn-primary" disabled={!(Number(cash) >= 0) || cash === ""} onClick={async () => { setCashMsg("Saving…"); try { await saveProfile({ cashInHand: { amount: Number(cash), asOf: ymd(new Date()) } }); setCashMsg("Saved ✓ — check the dashboard"); } catch (e) { setCashMsg("Failed: " + ((e as Error).message || "unknown error")); } }}>Set</button>
          {profile.cashInHand && <button className="btn-ghost" onClick={async () => { setCash(""); await deleteField(); }}>Clear</button>}
        </div>
      </div>
      {cashMsg && <p className="text-xs text-muted">{cashMsg}</p>}
      <Field label="Left over from previous cycle, cash in hand (₹)">
        <input className="input" type="number" placeholder="0" value={carry} onChange={(e) => setCarry(e.target.value)} />
      </Field>
      <button className="btn-primary" onClick={save}>{done ? "Saved ✓" : "Save salary"}</button>
    </section>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { profile, saveProfile } = useData();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: profile.name || user?.displayName || "", salary: profile.salary, salaryDay: profile.salaryDay, savingsTarget: profile.savingsTarget },
  });

  return (
    <div className="max-w-xl">
      <PageHeader title="Settings" subtitle={user?.email ?? undefined} />
      <form
        className="card space-y-4"
        onSubmit={handleSubmit(async (v) => { await saveProfile(v); setSaved(true); setTimeout(() => setSaved(false), 2000); })}
      >
        <h2 className="font-medium">Profile & salary</h2>
        <Field label="Name"><input className="input" {...register("name")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly salary (₹)" error={errors.salary?.message}><input className="input" type="number" {...register("salary", { valueAsNumber: true })} /></Field>
          <Field label="Salary credit day" error={errors.salaryDay?.message}><input className="input" type="number" {...register("salaryDay", { valueAsNumber: true })} /></Field>
        </div>
        <Field label="Monthly savings target (₹)" error={errors.savingsTarget?.message}><input className="input" type="number" {...register("savingsTarget", { valueAsNumber: true })} /></Field>
        <button className="btn-primary" disabled={isSubmitting}>{saved ? "Saved ✓" : "Save changes"}</button>
      </form>
      <SalaryByCycle key={profile.salaryDay} />
      <p className="mt-3 text-xs text-muted">Manage EMIs and other fixed items under EMIs & Loans, and category limits under Budgets.</p>
      <button className="btn-ghost mt-6" onClick={async () => { await logout(); router.replace("/login"); }}><LogOut className="h-4 w-4" />Sign out</button>
    </div>
  );
}
