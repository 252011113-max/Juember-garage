import { Suspense } from "react";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import {
  getReportDateRange,
  isReportPeriod,
  type ReportPeriod,
} from "@/lib/reports/date-range";
import { isQueueStatus, queueStatusLabels } from "@/lib/queue/status";
import { prisma } from "@/lib/prisma";

type ReportsPageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default function AdminReportsPage(props: ReportsPageProps) {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <AdminReports {...props} />
    </Suspense>
  );
}

async function AdminReports({ searchParams }: ReportsPageProps) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const period: ReportPeriod =
    params.period && isReportPeriod(params.period) ? params.period : "daily";
  const range = getReportDateRange(period);
  const tickets = await prisma.queueTicket.findMany({
    where: { queueDate: { gte: range.start, lt: range.end } },
    orderBy: [{ queueDate: "desc" }, { createdAt: "asc" }],
    include: {
      customer: { select: { name: true } },
      vehicle: { select: { plateNumber: true } },
      serviceType: { select: { name: true } },
      mechanic: { select: { name: true } },
    },
  });
  const statusCounts = new Map<string, number>();
  const completed = tickets.filter(
    (ticket) => ticket.status === "DONE" && ticket.startedAt && ticket.finishedAt,
  );
  const revenue = completed.reduce(
    (sum, ticket) => sum + (ticket.totalCost ?? 0),
    0,
  );
  const durationTotal = completed.reduce(
    (sum, ticket) =>
      sum + (ticket.finishedAt!.getTime() - ticket.startedAt!.getTime()),
    0,
  );
  for (const ticket of tickets) {
    statusCounts.set(ticket.status, (statusCounts.get(ticket.status) ?? 0) + 1);
  }
  const averageMinutes =
    completed.length > 0
      ? Math.round(durationTotal / completed.length / 60000)
      : null;
  const periodLabels: Record<ReportPeriod, string> = {
    daily: "Harian",
    weekly: "Mingguan",
    monthly: "Bulanan",
  };
  const csvHref = `/api/admin/reports/csv?period=${period}`;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">Analitik</p>
          <h1 className="mt-2 text-3xl font-bold">Laporan {periodLabels[period].toLowerCase()}</h1>
          <p className="mt-2 text-sm text-slate-400">
            Periode {range.startKey} sampai {previousDay(range.endKey)}.
          </p>
        </div>
        <a
          href={csvHref}
          className="min-h-11 rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 hover:bg-amber-300"
        >
          Unduh CSV
        </a>
      </header>
      <nav aria-label="Periode laporan" className="flex flex-wrap gap-2">
        {(["daily", "weekly", "monthly"] as const).map((value) => (
          <a
            key={value}
            href={`/admin/laporan?period=${value}`}
            aria-current={period === value ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              period === value
                ? "bg-amber-400 text-slate-950"
                : "border border-slate-700 text-slate-300 hover:border-amber-400"
            }`}
          >
            {periodLabels[value]}
          </a>
        ))}
      </nav>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total antrian" value={tickets.length} />
        <SummaryCard label="Tiket selesai" value={statusCounts.get("DONE") ?? 0} />
        <SummaryCard label="Rata-rata durasi servis" value={averageMinutes === null ? "—" : `${averageMinutes} menit`} />
        <SummaryCard label="Pendapatan" value={formatCurrency(revenue)} />
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-xl font-bold">Jumlah per status</h2>
        <div className="flex flex-wrap gap-2">
          {Array.from(statusCounts, ([status, count]) => (
            <span key={status} className="rounded-full border border-slate-700 px-3 py-2 text-sm">
              {isQueueStatus(status) ? queueStatusLabels[status] : status}: {count}
            </span>
          ))}
          {statusCounts.size === 0 ? <p className="text-sm text-slate-400">Belum ada data pada periode ini.</p> : null}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-xl font-bold">Rincian tiket ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-5 text-sm text-slate-400">Belum ada tiket pada periode ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="text-slate-400">
                <tr><th className="pb-3">Tanggal</th><th>Nomor</th><th>Pelanggan</th><th>Kendaraan</th><th>Layanan</th><th>Status</th><th>Mekanik</th><th>Biaya</th></tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-slate-800">
                    <td className="py-3">{ticket.queueDate.toISOString().slice(0, 10)}</td>
                    <td className="font-bold text-amber-300">{ticket.queueNumber}</td>
                    <td>{ticket.customer.name}</td>
                    <td>{ticket.vehicle.plateNumber}</td>
                    <td>{ticket.serviceType.name}</td>
                    <td>{isQueueStatus(ticket.status) ? queueStatusLabels[ticket.status] : ticket.status}</td>
                    <td>{ticket.mechanic?.name ?? "—"}</td>
                    <td>{ticket.totalCost === null ? "—" : formatCurrency(ticket.totalCost)}</td>
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

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-amber-300">{value}</p>
    </article>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function previousDay(exclusiveDate: string): string {
  const date = new Date(`${exclusiveDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
