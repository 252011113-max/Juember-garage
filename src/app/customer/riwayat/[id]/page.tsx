import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CancelTicketButton } from "@/components/customer/cancel-ticket-button";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { QueueStatusBadge } from "@/components/customer/queue-status-badge";
import { requireRole } from "@/lib/auth/require-role";
import { isQueueStatus, queueStatusLabels } from "@/lib/queue/status";
import { prisma } from "@/lib/prisma";
import { resourceIdSchema } from "@/lib/validation/customer";

type CustomerTicketDetailProps = {
  params: Promise<{ id: string }>;
};

export default function CustomerTicketDetailPage({
  params,
}: CustomerTicketDetailProps) {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <CustomerTicketDetail params={params} />
    </Suspense>
  );
}

async function CustomerTicketDetail({ params }: CustomerTicketDetailProps) {
  const user = await requireRole("CUSTOMER");
  const { id } = await params;
  if (!resourceIdSchema.safeParse(id).success) {
    notFound();
  }
  const ticket = await prisma.queueTicket.findFirst({
    where: { id, customerId: user.id },
    include: {
      vehicle: {
        select: { plateNumber: true, type: true, brand: true, model: true, year: true },
      },
      serviceType: {
        select: { name: true, basePrice: true, estimatedMinutes: true },
      },
      mechanic: { select: { name: true } },
      statusLogs: {
        orderBy: { createdAt: "asc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/customer/riwayat"
        className="inline-flex text-sm font-semibold text-amber-300 hover:text-amber-200"
      >
        ← Kembali ke riwayat
      </Link>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Nomor antrian</p>
            <h1 className="mt-1 text-4xl font-black text-amber-400">
              {ticket.queueNumber}
            </h1>
          </div>
          <QueueStatusBadge status={ticket.status} />
        </div>
        <dl className="mt-7 grid gap-5 sm:grid-cols-2">
          <DetailItem label="Tanggal antrian" value={formatDate(ticket.queueDate)} />
          <DetailItem label="Jenis servis" value={ticket.serviceType.name} />
          <DetailItem
            label="Kendaraan"
            value={`${ticket.vehicle.plateNumber} · ${ticket.vehicle.brand} ${ticket.vehicle.model} (${ticket.vehicle.year})`}
          />
          <DetailItem
            label="Mekanik"
            value={ticket.mechanic?.name ?? "Belum ditugaskan"}
          />
          <DetailItem label="Keluhan" value={ticket.complaint} />
          <DetailItem
            label="Biaya dasar servis"
            value={formatCurrency(ticket.serviceType.basePrice)}
          />
          <DetailItem label="Biaya jasa" value={formatCurrency(ticket.laborCost)} />
          <DetailItem label="Biaya suku cadang" value={formatCurrency(ticket.partsCost)} />
          <DetailItem label="Biaya akhir" value={formatCurrency(ticket.totalCost)} />
          <DetailItem
            label="Catatan servis"
            value={ticket.notes ?? "Belum ada catatan servis."}
          />
        </dl>
        {ticket.status === "WAITING" ? (
          <div className="mt-6 border-t border-slate-800 pt-5">
            <CancelTicketButton ticketId={ticket.id} />
          </div>
        ) : null}
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-bold">Perubahan status</h2>
        {ticket.statusLogs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Belum ada catatan perubahan status.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {ticket.statusLogs.map((log) => (
              <li
                key={log.id}
                className="flex flex-col gap-1 border-l-2 border-amber-400/40 pl-4"
              >
                <p className="font-semibold">
                  {log.fromStatus && isQueueStatus(log.fromStatus)
                    ? `${queueStatusLabels[log.fromStatus]} → `
                    : ""}
                  {isQueueStatus(log.toStatus)
                    ? queueStatusLabels[log.toStatus]
                    : "Status tidak valid"}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(log.createdAt)} · {log.changedBy.name}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{value}</dd>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatCurrency(amount: number | null): string {
  return amount === null
    ? "Belum dihitung"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount);
}
