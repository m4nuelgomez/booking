import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import NewBusinessForm from "./NewBusinessForm";

export default async function NewBusinessPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="mx-auto max-w-md space-y-4">
        <Link
          href="/admin/businesses"
          className="text-sm text-white/70 underline"
        >
          ← Volver
        </Link>

        <div>
          <h1 className="text-xl font-semibold">Crear negocio</h1>
          <p className="text-sm text-white/60">
            Crea un negocio y genera el enlace de acceso para el panel.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
          <NewBusinessForm />
        </div>
      </div>
    </div>
  );
}
