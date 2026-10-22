"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import {
  collection, doc, onSnapshot, setDoc, addDoc, deleteDoc, writeBatch, runTransaction, increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth";
import { Budget, Commitment, Goal, Profile, Transaction } from "./types";
import { clampDay, parseYmd, ym, ymd } from "./dates";
import { isFinished } from "./calc";

export const DEFAULT_COMMITMENTS: Omit<Commitment, "id">[] = [
  { name: "Car EMI", amount: 14500, dueDay: 5, kind: "loan", tenure: 60, paid: 0, paused: false },
  { name: "Personal Loan EMI", amount: 5500, dueDay: 10, kind: "loan", tenure: 24, paid: 0, paused: false },
  { name: "LIC Premium", amount: 1000, dueDay: 15, kind: "bill", tenure: 0, paid: 0, paused: false },
];

export const DEFAULT_PROFILE: Profile = { name: "", salary: 50000, salaryDay: 25, savingsTarget: 10000, onboarded: false };

type TxnInput = Omit<Transaction, "id">;
type CommitmentInput = Omit<Commitment, "id">;

interface DataCtx {
  ready: boolean;
  profile: Profile;
  transactions: Transaction[];
  commitments: Commitment[];
  budgets: Budget[];
  goals: Goal[];
  saveProfile: (p: Partial<Profile>) => Promise<void>;
  completeOnboarding: (p: Profile, cs: CommitmentInput[]) => Promise<void>;
  addTransaction: (t: TxnInput) => Promise<void>;
  updateTransaction: (id: string, t: TxnInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveCommitment: (c: CommitmentInput, id?: string) => Promise<void>;
  deleteCommitment: (id: string) => Promise<void>;
  markPaid: (c: Commitment, month?: string) => Promise<void>;
  unmarkPaid: (c: Commitment, month?: string) => Promise<void>;
  saveBudget: (category: string, limit: number) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  saveGoal: (g: Omit<Goal, "id">, id?: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

/** Firestore rejects undefined, so drop those keys. */
function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState({ profile: false, txns: false, cs: false });
  const uid = user?.uid;

  useEffect(() => {
    setLoaded({ profile: false, txns: false, cs: false });
    if (!db || !uid) return;
    const u = doc(db, "users", uid);
    const subs = [
      onSnapshot(u, (s) => {
        setProfile(s.exists() ? { ...DEFAULT_PROFILE, ...(s.data() as Partial<Profile>) } : DEFAULT_PROFILE);
        setLoaded((l) => ({ ...l, profile: true }));
      }),
      onSnapshot(collection(u, "transactions"), (s) => {
        setTransactions(s.docs.map((d) => ({ ...(d.data() as Omit<Transaction, "id">), id: d.id })));
        setLoaded((l) => ({ ...l, txns: true }));
      }),
      onSnapshot(collection(u, "commitments"), (s) => {
        setCommitments(s.docs.map((d) => ({ ...(d.data() as Omit<Commitment, "id">), id: d.id })));
        setLoaded((l) => ({ ...l, cs: true }));
      }),
      onSnapshot(collection(u, "budgets"), (s) => setBudgets(s.docs.map((d) => ({ ...(d.data() as Omit<Budget, "id">), id: d.id })))),
      onSnapshot(collection(u, "goals"), (s) => setGoals(s.docs.map((d) => ({ ...(d.data() as Omit<Goal, "id">), id: d.id })))),
    ];
    return () => subs.forEach((f) => f());
  }, [uid]);

  const ready = loaded.profile && loaded.txns && loaded.cs;
  const userDoc = () => {
    if (!db || !uid) throw new Error("Not signed in");
    return doc(db, "users", uid);
  };
  const sub = (name: string, id?: string) => {
    const u = userDoc();
    return id ? doc(u, name, id) : collection(u, name);
  };

  const markPaid = async (c: Commitment, month = ym(new Date())) => {
    if (!db) return;
    const tRef = doc(userDoc(), "transactions", `emi_${c.id}_${month}`);
    const cRef = doc(userDoc(), "commitments", c.id);
    await runTransaction(db, async (tx) => {
      const [t, cs] = await Promise.all([tx.get(tRef), tx.get(cRef)]);
      if (t.exists() || !cs.exists()) return; // idempotent: already generated
      const day = clampDay(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, c.dueDay);
      const date = month === ym(new Date()) && day > new Date().getDate() ? ymd(new Date()) : `${month}-${String(day).padStart(2, "0")}`;
      const txn: TxnInput = {
        type: "expense", amount: c.amount, category: "EMI", date, method: "Bank",
        note: c.name, tags: ["fixed"], commitmentId: c.id, commitmentMonth: month,
      };
      tx.set(tRef, txn);
      tx.update(cRef, { paid: increment(c.tenure > 0 ? 1 : 0) });
    });
  };

  const unmarkPaid = async (c: Commitment, month = ym(new Date())) => {
    if (!db) return;
    const tRef = doc(userDoc(), "transactions", `emi_${c.id}_${month}`);
    const cRef = doc(userDoc(), "commitments", c.id);
    await runTransaction(db, async (tx) => {
      const t = await tx.get(tRef);
      if (!t.exists()) return;
      tx.delete(tRef);
      tx.update(cRef, { paid: increment(c.tenure > 0 ? -1 : 0) });
    });
  };

  // Auto-generate this month's commitment transactions once their due date has passed.
  const autoRan = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!ready || !profile.onboarded) return;
    const month = ym(new Date());
    const today = new Date().getDate();
    for (const c of commitments) {
      if (c.paused || isFinished(c)) continue;
      const key = `${c.id}_${month}`;
      const has = transactions.some((t) => t.commitmentId === c.id && t.commitmentMonth === month);
      const manuallyUnmarked = typeof window !== "undefined" && sessionStorage.getItem(`unmarked_${key}`);
      if (has || manuallyUnmarked || autoRan.current.has(key)) continue;
      if (clampDay(new Date().getFullYear(), new Date().getMonth(), c.dueDay) <= today) {
        autoRan.current.add(key);
        markPaid(c, month).catch(() => autoRan.current.delete(key));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, profile.onboarded, commitments, transactions]);

  const value = useMemo<DataCtx>(() => ({
    ready, profile, transactions, commitments, budgets, goals,
    saveProfile: async (p) => { await setDoc(userDoc(), p, { merge: true }); },
    completeOnboarding: async (p, cs) => {
      const batch = writeBatch(db!);
      batch.set(userDoc(), { ...p, onboarded: true }, { merge: true });
      for (const c of cs) batch.set(doc(collection(userDoc(), "commitments")), c);
      await batch.commit();
    },
    addTransaction: async (t) => { await addDoc(sub("transactions") as ReturnType<typeof collection>, clean(t)); },
    updateTransaction: async (id, t) => { await setDoc(sub("transactions", id) as ReturnType<typeof doc>, clean(t)); },
    deleteTransaction: async (id) => {
      const t = transactions.find((x) => x.id === id);
      if (t?.commitmentId && t.commitmentMonth) {
        const c = commitments.find((x) => x.id === t.commitmentId);
        if (c) {
          sessionStorage.setItem(`unmarked_${c.id}_${t.commitmentMonth}`, "1");
          return unmarkPaid(c, t.commitmentMonth);
        }
      }
      await deleteDoc(sub("transactions", id) as ReturnType<typeof doc>);
    },
    saveCommitment: async (c, id) => {
      if (id) await setDoc(sub("commitments", id) as ReturnType<typeof doc>, c);
      else await addDoc(sub("commitments") as ReturnType<typeof collection>, c);
    },
    deleteCommitment: async (id) => { await deleteDoc(sub("commitments", id) as ReturnType<typeof doc>); },
    markPaid: async (c, m) => {
      sessionStorage.removeItem(`unmarked_${c.id}_${m ?? ym(new Date())}`);
      await markPaid(c, m);
    },
    unmarkPaid: async (c, m) => {
      sessionStorage.setItem(`unmarked_${c.id}_${m ?? ym(new Date())}`, "1");
      await unmarkPaid(c, m);
    },
    saveBudget: async (category, limit) => {
      const existing = budgets.find((b) => b.category === category);
      await setDoc(sub("budgets", existing?.id ?? `b_${category}`) as ReturnType<typeof doc>, { category, limit });
    },
    deleteBudget: async (id) => { await deleteDoc(sub("budgets", id) as ReturnType<typeof doc>); },
    saveGoal: async (g, id) => {
      if (id) await setDoc(sub("goals", id) as ReturnType<typeof doc>, g);
      else await addDoc(sub("goals") as ReturnType<typeof collection>, g);
    },
    deleteGoal: async (id) => { await deleteDoc(sub("goals", id) as ReturnType<typeof doc>); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ready, profile, transactions, commitments, budgets, goals, uid]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useData outside DataProvider");
  return c;
}

export { parseYmd };
