import Link from "next/link";
import { Suspense } from "react";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";

export default function MechanicHistoryPage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <MechanicHistory />
    </Suspense>
  );
}

async function MechanicHistory() {
  const mechanic = await requireRole("MECHANIC");
  const tickets = await prisma.queueTicket.findMany({
    where: { mechanicId: mechanic.id, status: "DONE" },
    orderBy: [{ finishedAt: "desc" }, { id: "desc" }],
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
          Catatan pekerjaan
        </p>
        <h1 className="mt-2 text-3xl font-bold">Riwayat pekerjaan</h1>
      </header>
      {tickets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
          Belum ada pekerjaan yang selesai.
        </p>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/mechanic/pekerjaan/${ticket.id}`}
              className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-cyan-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold text-cyan-300">
                  {ticket.queueNumber} · {ticket.serviceType.name}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {ticket.vehicle.plateNumber} · {ticket.vehicle.brand}{" "}
                  {ticket.vehicle.model}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {ticket.customer.name} · {formatDate(ticket.finishedAt ?? ticket.queueDate)}
                </p>
              </div>
              <p className="text-sm font-semibold">
                {formatCurrency(ticket.totalCost)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatCurrency(amount: number | null): string {
  return amount === null
    ? "Biaya belum dihitung"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount);
}
