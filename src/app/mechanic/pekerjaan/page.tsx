import Link from "next/link";
import { Suspense } from "react";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import { dateFromDateKey, getWorkshopDateKey } from "@/lib/queue/date";
import { isQueueStatus, queueStatusLabels } from "@/lib/queue/status";
import { prisma } from "@/lib/prisma";

export default function MechanicWorkListPage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <MechanicWorkList />
    </Suspense>
  );
}

async function MechanicWorkList() {
  const mechanic = await requireRole("MECHANIC");
  const today = dateFromDateKey(getWorkshopDateKey());
  const tickets = await prisma.queueTicket.findMany({
    where: { mechanicId: mechanic.id, queueDate: today },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      customer: { select: { name: true } },
      vehicle: { select: { plateNumber: true, brand: true, model: true } },
      serviceType: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
          Tugas servis
        </p>
        <h1 className="mt-2 text-3xl font-bold">Pekerjaan hari ini</h1>
      </header>
      {tickets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
          Belum ada pekerjaan yang ditugaskan kepada Anda hari ini.
        </p>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/mechanic/pekerjaan/${ticket.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-cyan-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xl font-black text-cyan-300">{ticket.queueNumber}</p>
                <span className="rounded-full border border-cyan-900 px-3 py-1 text-xs font-semibold text-cyan-200">
                  {isQueueStatus(ticket.status)
                    ? queueStatusLabels[ticket.status]
                    : ticket.status}
                </span>
              </div>
              <p className="mt-2 font-semibold">{ticket.serviceType.name}</p>
              <p className="mt-1 text-sm text-slate-300">
                {ticket.vehicle.plateNumber} · {ticket.vehicle.brand}{" "}
                {ticket.vehicle.model}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Pelanggan: {ticket.customer.name}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
