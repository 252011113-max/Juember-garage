import Link from "next/link";
import { Suspense } from "react";
import { QueueForm } from "@/components/customer/queue-form";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import {
  addDaysToDateKey,
  getWorkshopDateKey,
  isAfterWorkshopClosingTime,
} from "@/lib/queue/date";
import { prisma } from "@/lib/prisma";

export default function CreateQueuePage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <CreateQueueContent />
    </Suspense>
  );
}

async function CreateQueueContent() {
  const user = await requireRole("CUSTOMER");
  const [vehicles, services, setting] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, plateNumber: true, brand: true, model: true },
    }),
    prisma.serviceType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, estimatedMinutes: true, basePrice: true },
    }),
    prisma.workshopSetting.findUnique({
      where: { id: "default" },
      select: { closeTime: true },
    }),
  ]);
  const today = getWorkshopDateKey();
  const tomorrow = addDaysToDateKey(today, 1);
  const afterHours =
    setting !== null &&
    isAfterWorkshopClosingTime(new Date(), setting.closeTime);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
          Antrian servis
        </p>
        <h1 className="mt-2 text-3xl font-bold">Ambil nomor antrian</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Pilih kendaraan dan layanan. Nomor dibuat sesuai urutan permintaan
          yang berhasil disimpan.
        </p>
      </header>
      {vehicles.length === 0 ? (
        <div className="rounded-2xl border border-amber-900 bg-amber-950/40 p-5">
          <p className="font-semibold">Tambahkan kendaraan terlebih dahulu.</p>
          <Link
            href="/customer/kendaraan"
            className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-amber-400 px-4 text-sm font-bold text-slate-950"
          >
            Kelola kendaraan
          </Link>
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">
          Belum ada jenis servis yang tersedia. Silakan hubungi bengkel.
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <QueueForm
            vehicles={vehicles}
            services={services}
            today={today}
            maxDate={addDaysToDateKey(today, 7)}
            afterHours={afterHours}
            tomorrow={tomorrow}
          />
        </section>
      )}
    </div>
  );
}
