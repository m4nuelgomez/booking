"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
    }
  }

  return (
    <button
      onClick={logout}
      className="text-xs text-zinc-300 hover:text-white"
      title="Logout"
    >
      Logout
    </button>
  );
}
