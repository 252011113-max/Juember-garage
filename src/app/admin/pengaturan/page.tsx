import { Suspense } from "react";
import { WorkshopSettingsForm } from "@/components/admin/admin-forms";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <AdminSettings />
    </Suspense>
  );
}

async function AdminSettings() {
  await requireRole("ADMIN");
  const settings = await prisma.workshopSetting.findUnique({
    where: { id: "default" },
  });
  if (!settings) {
    return (
      <section className="rounded-2xl border border-rose-900 bg-slate-900 p-5 text-rose-200">
        Pengaturan bengkel belum tersedia. Jalankan seed atau siapkan data pengaturan awal.
      </section>
    );
  }
  let parsedHolidays: unknown;
  try {
    parsedHolidays = JSON.parse(settings.holidays);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return (
        <section className="rounded-2xl border border-rose-900 bg-slate-900 p-5 text-rose-200">
          Data hari libur tidak dapat dibaca. Perbaiki data hari libur sebelum menyimpan pengaturan.
        </section>
      );
    }
    throw error;
  }
  if (!Array.isArray(parsedHolidays) || parsedHolidays.some((day) => typeof day !== "string")) {
    return (
      <section className="rounded-2xl border border-rose-900 bg-slate-900 p-5 text-rose-200">
        Format hari libur tidak valid. Data tidak ditampilkan agar tidak tertimpa tanpa sengaja.
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">Operasional bengkel</p>
        <h1 className="mt-2 text-3xl font-bold">Pengaturan</h1>
        <p className="mt-2 text-sm text-slate-400">Jam dan tanggal mengikuti kalender Asia/Jakarta.</p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <WorkshopSettingsForm
          settings={{
            openTime: settings.openTime,
            closeTime: settings.closeTime,
            dailyQuota: settings.dailyQuota,
          }}
          holidays={parsedHolidays}
        />
      </section>
    </div>
  );
}
