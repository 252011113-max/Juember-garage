import Link from "next/link";
import { Suspense } from "react";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import { addDaysToDateKey, dateFromDateKey, getWorkshopDateKey } from "@/lib/queue/date";
import { isQueueStatus, queueStatuses, queueStatusLabels } from "@/lib/queue/status";
import { prisma } from "@/lib/prisma";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <AdminDashboard />
    </Suspense>
  );
}

async function AdminDashboard() {
  await requireRole("ADMIN");
  const todayKey = getWorkshopDateKey();
  const today = dateFromDateKey(todayKey);
  const tomorrow = dateFromDateKey(addDaysToDateKey(todayKey, 1));
  const [tickets, mechanics, completed, recent] = await Promise.all([
    prisma.queueTicket.groupBy({
      by: ["status"],
      where: { queueDate: today },
      _count: { _all: true },
    }),
    prisma.user.count({ where: { role: "MECHANIC", isActive: true } }),
    prisma.queueTicket.findMany({
      where: {
        status: "DONE",
        finishedAt: { gte: today, lt: tomorrow },
        startedAt: { not: null },
      },
      select: { startedAt: true, finishedAt: true, totalCost: true },
    }),
    prisma.queueTicket.findMany({
      where: { queueDate: today },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8,
      include: {
        customer: { select: { name: true } },
        vehicle: { select: { plateNumber: true } },
        mechanic: { select: { name: true } },
        serviceType: { select: { name: true } },
      },
    }),
  ]);
  const counts = Object.fromEntries(
    queueStatuses.map((status) => [status, 0]),
  ) as Record<(typeof queueStatuses)[number], number>;
  for (const ticket of tickets) {
    if (isQueueStatus(ticket.status)) counts[ticket.status] = ticket._count._all;
  }
  const durations = completed.flatMap((ticket) =>
    ticket.startedAt && ticket.finishedAt
      ? [ticket.finishedAt.getTime() - ticket.startedAt.getTime()]
      : [],
  );
  const averageMinutes =
    durations.length > 0
      ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length / 60000)
      : null;
  const revenue = completed.reduce((sum, ticket) => sum + (ticket.totalCost ?? 0), 0);
  const cards = [
    ...queueStatuses.map((status) => ({
      label: queueStatusLabels[status],
      value: counts[status],
    })),
    { label: "Rata-rata durasi servis", value: averageMinutes === null ? "—" : `${averageMinutes} menit` },
    { label: "Mekanik aktif", value: mechanics },
    { label: "Pendapatan hari ini", value: formatCurrency(revenue) },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">Ringkasan bengkel</p>
          <h1 className="mt-2 text-3xl font-bold">Dashboard admin</h1>
          <p className="mt-2 text-sm text-slate-400">Data tanggal {todayKey}, waktu bengkel Asia/Jakarta.</p>
        </div>
        <Link href="/admin/antrian" className="rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950">Kelola antrian</Link>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">{card.value}</p>
          </article>
        ))}
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Antrian terbaru</h2>
          <Link href="/admin/laporan" className="text-sm text-amber-300 hover:underline">Buka laporan</Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-5 text-sm text-slate-400">Belum ada antrian hari ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="text-slate-400"><tr><th className="pb-3">Nomor</th><th>Pelanggan</th><th>Kendaraan</th><th>Layanan</th><th>Status</th><th>Mekanik</th></tr></thead>
              <tbody>
                {recent.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-slate-800">
                    <td className="py-3 font-bold text-amber-300">{ticket.queueNumber}</td>
                    <td>{ticket.customer.name}</td>
                    <td>{ticket.vehicle.plateNumber}</td>
                    <td>{ticket.serviceType.name}</td>
                    <td>{isQueueStatus(ticket.status) ? queueStatusLabels[ticket.status] : ticket.status}</td>
                    <td>{ticket.mechanic?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
