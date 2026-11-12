import { Suspense } from "react";
import { AdminServiceForm } from "@/components/admin/admin-forms";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";

export default function AdminServicesPage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <AdminServices />
    </Suspense>
  );
}

async function AdminServices() {
  await requireRole("ADMIN");
  const services = await prisma.serviceType.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { tickets: true } } },
  });
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">Katalog bengkel</p>
        <h1 className="mt-2 text-3xl font-bold">Jenis servis</h1>
        <p className="mt-2 text-sm text-slate-400">Atur estimasi durasi dan harga dasar layanan.</p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-xl font-bold">Tambah jenis servis</h2>
        <AdminServiceForm />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Daftar layanan</h2>
        {services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-400">Belum ada jenis servis.</div>
        ) : services.map((service) => (
          <article key={service.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold">{service.name}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {service.estimatedMinutes} menit · {formatCurrency(service.basePrice)} · {service._count.tickets} tiket
                </p>
              </div>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs">{service.isActive ? "Aktif" : "Nonaktif"}</span>
            </div>
            <details>
              <summary className="min-h-10 cursor-pointer text-sm font-semibold text-amber-300">Ubah atau hapus layanan</summary>
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <AdminServiceForm service={service} />
              </div>
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
