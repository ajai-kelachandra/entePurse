"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, signOut, updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  google: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const need = () => {
    if (!auth) throw new Error("Firebase is not configured.");
    return auth;
  };

  const value: AuthCtx = {
    user,
    loading,
    signIn: async (email, password) => { await signInWithEmailAndPassword(need(), email, password); },
    signUp: async (name, email, password) => {
      const cred = await createUserWithEmailAndPassword(need(), email, password);
      await updateProfile(cred.user, { displayName: name });
    },
    google: async () => { await signInWithPopup(need(), new GoogleAuthProvider()); },
    logout: async () => { await signOut(need()); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
