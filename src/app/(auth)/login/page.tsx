import LoginForm from "./LoginForm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;

  const cookieStore = await cookies();
  const gate = cookieStore.get("booking_gate")?.value;
  const bid = cookieStore.get("booking_bid")?.value;

  if (gate === "1") {
    const next = sp?.next;

    if (next && next.startsWith("/")) {
      redirect(next);
    }

    if (!bid) redirect("/onboarding");

    redirect("/app/inbox");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow">
        <h1 className="text-xl font-semibold">Booking</h1>

        <p className="text-sm text-zinc-400 mt-1">
          Ingresa la contraseña de acceso para continuar.
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
