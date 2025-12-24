"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
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
