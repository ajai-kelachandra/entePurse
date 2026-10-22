"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data";
import { firebaseConfigured } from "@/lib/firebase";
import { SetupNotice, Spinner } from "@/components/ui";

export default function Home() {
  const { user, loading } = useAuth();
  const { ready, profile } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!firebaseConfigured || loading) return;
    if (!user) router.replace("/login");
    else if (ready) router.replace(profile.onboarded ? "/dashboard" : "/onboarding");
  }, [user, loading, ready, profile.onboarded, router]);

  if (!firebaseConfigured) return <SetupNotice />;
  return <Spinner />;
}
