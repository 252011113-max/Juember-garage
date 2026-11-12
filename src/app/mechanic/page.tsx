import Link from "next/link";
import { Suspense } from "react";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import { dateFromDateKey, getWorkshopDateKey } from "@/lib/queue/date";
import { isQueueStatus, queueStatusLabels } from "@/lib/queue/status";
import { prisma } from "@/lib/prisma";

export default function MechanicDashboardPage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <MechanicDashboard />
    </Suspense>
  );
}

async function MechanicDashboard() {
  const mechanic = await requireRole("MECHANIC");
  const todayKey = getWorkshopDateKey();
  const today = dateFromDateKey(todayKey);
  const tickets = await prisma.queueTicket.findMany({
    where: { mechanicId: mechanic.id, queueDate: today },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      vehicle: { select: { plateNumber: true, brand: true, model: true } },
      serviceType: { select: { name: true } },
    },
  });
  const activeCount = tickets.filter((ticket) =>
    ["CALLED", "IN_PROGRESS"].includes(ticket.status),
  ).length;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-cyan-900/70 bg-gradient-to-br from-cyan-950/60 to-slate-900 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
          Ruang kerja mekanik
        </p>
        <h1 className="mt-2 text-3xl font-bold">Pekerjaan servis</h1>
        <p className="mt-3 text-sm text-slate-300">
          Tugas yang ditugaskan kepada Anda untuk {formatDate(today)}.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <SummaryCard label="Total tugas hari ini" value={tickets.length} />
          <SummaryCard label="Perlu ditangani" value={activeCount} />
        </div>
      </header>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Daftar pekerjaan hari ini</h2>
          <Link
            href="/mechanic/pekerjaan"
            className="text-sm font-semibold text-cyan-300 hover:underline"
          >
            Lihat semua pekerjaan
          </Link>
        </div>
        {tickets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
            Belum ada pekerjaan yang ditugaskan kepada Anda hari ini.
          </p>
        ) : (
          <div className="space-y-3">
            {tickets.slice(0, 5).map((ticket) => (
              <Link
                key={ticket.id}
                href={`/mechanic/pekerjaan/${ticket.id}`}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-cyan-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-bold text-cyan-300">{ticket.queueNumber}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {ticket.serviceType.name} · {ticket.vehicle.plateNumber} ·{" "}
                    {ticket.vehicle.brand} {ticket.vehicle.model}
                  </p>
                </div>
                <StatusLabel status={ticket.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-36 rounded-xl border border-cyan-900/60 bg-slate-950/70 px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-cyan-200">{value}</p>
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  return (
    <span className="w-fit rounded-full border border-cyan-900 px-3 py-1 text-xs font-semibold text-cyan-200">
      {isQueueStatus(status) ? queueStatusLabels[status] : status}
    </span>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(date);
}
