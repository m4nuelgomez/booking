import AppShell from "@/components/AppShell";
import { cookies } from "next/headers";
import { COOKIE_ADMIN } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isAdmin = Boolean(cookieStore.get(COOKIE_ADMIN)?.value);

  return <AppShell isAdmin={isAdmin}>{children}</AppShell>;
}
