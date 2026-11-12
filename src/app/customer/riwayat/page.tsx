import Link from "next/link";
import { Suspense } from "react";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { QueueStatusBadge } from "@/components/customer/queue-status-badge";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";

export default function CustomerHistoryPage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <CustomerHistory />
    </Suspense>
  );
}

async function CustomerHistory() {
  const user = await requireRole("CUSTOMER");
  const [tickets, requests] = await Promise.all([
    prisma.queueTicket.findMany({
      where: { customerId: user.id },
      orderBy: [{ queueDate: "desc" }, { createdAt: "desc" }],
      include: {
        vehicle: { select: { plateNumber: true, brand: true, model: true } },
        serviceType: { select: { name: true } },
      },
    }),
    prisma.queueRequest.findMany({
      where: { customerId: user.id, status: { in: ["PENDING", "REJECTED"] } },
      orderBy: [{ queueDate: "desc" }, { createdAt: "desc" }],
      include: {
        vehicle: { select: { plateNumber: true, brand: true, model: true } },
        serviceType: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
          Catatan servis
        </p>
        <h1 className="mt-2 text-3xl font-bold">Riwayat antrian</h1>
      </header>
      {tickets.length === 0 && requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center">
          <p className="font-semibold">Belum ada riwayat servis.</p>
          <Link
            href="/customer/antrian"
            className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-amber-400 px-4 text-sm font-bold text-slate-950"
          >
            Ambil antrian
          </Link>
        </div>
      ) : null}
      {requests.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Permintaan antrian</h2>
          {requests.map((request) => (
            <article
              key={request.id}
              className="flex flex-col gap-3 rounded-xl border border-amber-900/70 bg-amber-950/30 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold text-amber-300">{request.queueNumber}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {request.serviceType.name} · {request.vehicle.plateNumber}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatDate(request.queueDate)}
                </p>
              </div>
              <span
                className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                  request.status === "PENDING"
                    ? "border-amber-700 text-amber-200"
                    : "border-rose-900 text-rose-200"
                }`}
              >
                {request.status === "PENDING"
                  ? "Menunggu persetujuan admin"
                  : "Permintaan ditolak"}
              </span>
            </article>
          ))}
        </section>
      ) : null}
      {tickets.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Riwayat servis</h2>
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/customer/riwayat/${ticket.id}`}
              className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-600 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold text-amber-300">{ticket.queueNumber}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {ticket.serviceType.name} · {ticket.vehicle.plateNumber}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(ticket.queueDate)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold">
                  {formatCurrency(ticket.totalCost)}
                </span>
                <QueueStatusBadge status={ticket.status} />
              </div>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
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
