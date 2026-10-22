"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/firebase";
import { Field, SetupNotice } from "@/components/ui";

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const { user, signIn, signUp, google } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => { if (user) router.replace("/"); }, [user, router]);
  if (!firebaseConfigured) return <SetupNotice />;

  const run = async (fn: () => Promise<void>) => {
    setError("");
    try { await fn(); } catch (e) {
      setError((e as { code?: string }).code?.replace("auth/", "").replace(/-/g, " ") ?? "Something went wrong");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white"><Wallet /></div>
        <h1 className="text-2xl font-semibold">Mony</h1>
        <p className="text-sm text-muted">Know what's safe to spend, every day.</p>
      </div>
      <form
        className="card space-y-4"
        onSubmit={handleSubmit((v) => run(() => (mode === "in" ? signIn(v.email, v.password) : signUp(v.name?.trim() || "", v.email, v.password))))}
      >
        {mode === "up" && (
          <Field label="Name"><input className="input" autoComplete="name" {...register("name")} /></Field>
        )}
        <Field label="Email" error={errors.email?.message}>
          <input className="input" type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input className="input" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} {...register("password")} />
        </Field>
        {error && <p className="err capitalize">{error}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>{mode === "in" ? "Sign in" : "Create account"}</button>
        <button type="button" className="btn-ghost w-full" onClick={() => run(google)}>Continue with Google</button>
      </form>
      <button className="mt-4 text-sm text-muted hover:text-ink" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
