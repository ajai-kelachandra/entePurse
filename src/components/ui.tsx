"use client";

import { ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import clsx from "clsx";

export const toneText = { good: "text-good", warn: "text-warn", bad: "text-bad", info: "text-brand" } as const;
export const toneBg = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", info: "bg-brand" } as const;

export function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function SetupNotice() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-5">
      <div className="card space-y-3">
        <h1 className="text-xl font-semibold">Connect Firebase to get started</h1>
        <p className="text-sm text-muted">
          Copy <code className="rounded bg-subtle px-1">.env.local.example</code> to{" "}
          <code className="rounded bg-subtle px-1">.env.local</code>, fill in your Firebase web app config, enable
          Email/Password and Google sign-in, create a Firestore database, then restart <code className="rounded bg-subtle px-1">npm run dev</code>.
        </p>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 pb-8 shadow-card md:max-w-md md:rounded-2xl md:pb-5"
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-subtle">
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Progress({ value, tone = "info", className }: { value: number; tone?: keyof typeof toneBg; className?: string }) {
  return (
    <div className={clsx("h-2 w-full overflow-hidden rounded-full bg-subtle", className)}>
      <motion.div
        className={clsx("h-full rounded-full", toneBg[tone])}
        initial={{ width: 0 }} animate={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</div>;
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="err">{error}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: keyof typeof toneText }) {
  return (
    <div className="card !p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={clsx("mt-1 text-xl font-semibold tabular-nums", tone && toneText[tone])}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** One categorical color per category, picked to stay legible in light and dark. */
export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f97316", Fuel: "#eab308", Groceries: "#22c55e", Shopping: "#ec4899", Bills: "#06b6d4",
  Travel: "#8b5cf6", Health: "#ef4444", Entertainment: "#3b82f6", Others: "#94a3b8", EMI: "#64748b",
};
export const colorFor = (c: string) => CATEGORY_COLORS[c] ?? "#94a3b8";
