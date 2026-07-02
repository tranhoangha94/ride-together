"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/teams" : "/login");
  }, [loading, user, router]);

  return (
    <main>
      <p className="hint">Đang tải...</p>
    </main>
  );
}
