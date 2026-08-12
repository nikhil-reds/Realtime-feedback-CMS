"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center space-x-1.5 bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
      title="Sign Out of Admin Session"
    >
      <LogOut className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">{loading ? "Leaving..." : "Logout"}</span>
    </button>
  );
}
