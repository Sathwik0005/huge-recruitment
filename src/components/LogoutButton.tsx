"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/config";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await signOut(auth);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="h-11 px-6 border border-outline-variant text-primary text-label-md font-bold rounded-lg hover:bg-surface-container-low transition-all disabled:opacity-60"
    >
      {loading ? "Signing out..." : "Sign Out"}
    </button>
  );
}
