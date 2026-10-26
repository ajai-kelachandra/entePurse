"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard, ArrowLeftRight, Landmark, PiggyBank, Target, BarChart3, Settings, Plus, Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data";
import { Modal, Spinner } from "./ui";
import { TransactionForm } from "./TransactionForm";
import { Transaction } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/commitments", label: "EMIs & Loans", icon: Landmark },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
const MOBILE_NAV = [NAV[0], NAV[1], NAV[2], NAV[5], NAV[6]];

const TxnModalCtx = createContext<(t?: Transaction) => void>(() => {});
export const useTxnModal = () => useContext(TxnModalCtx);

export function Shell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { ready, profile } = useData();
  const router = useRouter();
  const path = usePathname();
  const [modal, setModal] = useState<{ open: boolean; txn?: Transaction }>({ open: false });

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (ready && !profile.onboarded) router.replace("/onboarding");
  }, [loading, user, ready, profile.onboarded, router]);

  if (loading || !user || !ready || !profile.onboarded) return <Spinner />;

  const close = () => setModal({ open: false });

  return (
    <TxnModalCtx.Provider value={(txn) => setModal({ open: true, txn })}>
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line p-4 md:flex">
          <div className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white"><Wallet className="h-4 w-4" /></span>
            Mony
          </div>
          <nav className="space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href} href={href} replace
                className={clsx("flex items-center gap-3 rounded-xl px-3 py-2 text-sm", path === href ? "bg-brand/10 font-medium text-brand" : "text-muted hover:bg-subtle")}
              ><Icon className="h-4 w-4" />{label}</Link>
            ))}
          </nav>
          <button className="btn-primary mt-auto" onClick={() => setModal({ open: true })}><Plus className="h-4 w-4" />Add transaction</button>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))] md:px-8 md:pb-10">{children}</main>
      </div>

      <button
        aria-label="Add transaction" onClick={() => setModal({ open: true })}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg active:scale-95 md:hidden"
      ><Plus /></button>

      <nav className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black p-1.5 shadow-lg dark:bg-[#26262a] md:hidden">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href} href={href} replace aria-label={label}
              className={clsx("flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-medium", active ? "bg-white px-4 text-black" : "w-11 bg-neutral-800 text-white dark:bg-neutral-700")}
            ><Icon className="h-5 w-5" />{active && label.split(" ")[0]}</Link>
          );
        })}
      </nav>

      <Modal open={modal.open} onClose={close} title={modal.txn ? "Edit transaction" : "Add transaction"}>
        {modal.open && <TransactionForm key={modal.txn?.id ?? "new"} initial={modal.txn} onDone={close} />}
      </Modal>
    </TxnModalCtx.Provider>
  );
}
