import AutoRefresh from "./AutoRefresh.client";

export default function AdminGlobalPage() {
  return (
    <div className="min-h-[calc(100vh-0px)] text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Panel global</h1>
        <p className="text-sm text-white/60">
          Operación en tiempo real (24h por defecto)
        </p>
      </div>

      <AutoRefresh />
    </div>
  );
}
