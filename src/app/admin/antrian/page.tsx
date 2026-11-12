import Link from "next/link";
import { Suspense } from "react";
import {
  AdminQueueActions,
  AdminWalkInForm,
  CallNextButton,
} from "@/components/admin/admin-forms";
import { QueueRequestActions } from "@/components/admin/queue-request-actions";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import { dateFromDateKey, getWorkshopDateKey, isValidDateKey } from "@/lib/queue/date";
import { isQueueStatus, queueStatusLabels } from "@/lib/queue/status";
import { prisma } from "@/lib/prisma";

type QueuePageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default function AdminQueuePage(props: QueuePageProps) {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <AdminQueue {...props} />
    </Suspense>
  );
}

async function AdminQueue({ searchParams }: QueuePageProps) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const todayKey = getWorkshopDateKey();
  const dateKey = params.date && isValidDateKey(params.date) ? params.date : todayKey;
  const queueDate = dateFromDateKey(dateKey);
  const [tickets, requests, mechanics, customers, vehicles, services] = await Promise.all([
    prisma.queueTicket.findMany({
      where: { queueDate },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        customer: { select: { name: true, email: true } },
        vehicle: { select: { plateNumber: true, brand: true, model: true, ownerId: true } },
        serviceType: { select: { name: true } },
        mechanic: { select: { id: true, name: true } },
      },
    }),
    prisma.queueRequest.findMany({
      where: { status: "PENDING" },
      orderBy: [{ queueDate: "asc" }, { createdAt: "asc" }],
      include: {
        customer: { select: { name: true, email: true } },
        vehicle: { select: { plateNumber: true, brand: true, model: true } },
        serviceType: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "MECHANIC", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.vehicle.findMany({
      where: { owner: { role: "CUSTOMER", isActive: true } },
      orderBy: { plateNumber: "asc" },
      include: { owner: { select: { name: true } } },
    }),
    prisma.serviceType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const statusCounts = new Map<string, number>();
  for (const ticket of tickets) {
    statusCounts.set(ticket.status, (statusCounts.get(ticket.status) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">Operasional</p>
          <h1 className="mt-2 text-3xl font-bold">Kelola antrian</h1>
          <p className="mt-2 text-sm text-slate-400">Panggil, tugaskan mekanik, atau perbarui status tiket.</p>
        </div>
        <form className="flex items-end gap-2">
          <label className="text-sm">
            Tanggal
            <input name="date" type="date" defaultValue={dateKey} className="mt-1 min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3" />
          </label>
          <button className="min-h-11 rounded-lg border border-slate-700 px-4 font-semibold hover:border-amber-400">Tampilkan</button>
        </form>
      </header>
      <section className="space-y-4 rounded-2xl border border-amber-900/70 bg-amber-950/20 p-5">
        <div>
          <h2 className="text-xl font-bold">Permintaan setelah jam tutup</h2>
          <p className="mt-1 text-sm text-slate-400">
            Permintaan setelah jam tutup. Nomor masuk ke antrian pada tanggal
            yang diminta hanya setelah diterima.
          </p>
        </div>
        {requests.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            Tidak ada permintaan yang menunggu persetujuan.
          </p>
        ) : (
          requests.map((request) => (
            <article
              key={request.id}
              className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 lg:grid-cols-[1fr_auto] lg:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xl font-black text-amber-300">
                    {request.queueNumber}
                  </p>
                  <span className="rounded-full border border-amber-800 px-3 py-1 text-xs text-amber-200">
                    Tanggal antrian · {formatDate(request.queueDate)}
                  </span>
                </div>
                <p className="mt-2 font-semibold">
                  {request.customer.name}{" "}
                  <span className="font-normal text-slate-400">
                    · {request.customer.email}
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {request.vehicle.plateNumber} · {request.vehicle.brand}{" "}
                  {request.vehicle.model} · {request.serviceType.name}
                </p>
                <p className="mt-2 text-sm text-slate-400">{request.complaint}</p>
              </div>
              <QueueRequestActions requestId={request.id} />
            </article>
          ))
        )}
      </section>
      {dateKey === todayKey ? (
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-xl font-bold">Buat antrian walk-in</h2>
        <p className="mb-4 text-sm text-slate-400">
          Pelanggan walk-in harus memiliki akun dan kendaraan terdaftar. Nomor mengikuti kuota dan aturan operasional hari ini.
        </p>
        <AdminWalkInForm
          customers={customers}
          vehicles={vehicles.map((vehicle) => ({
            id: vehicle.id,
            plateNumber: vehicle.plateNumber,
            ownerId: vehicle.ownerId,
            ownerName: vehicle.owner.name,
          }))}
          services={services}
        />
      </section>
      ) : (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          Antrian walk-in hanya dapat dibuat untuk hari ini.
        </p>
      )}
      {dateKey === todayKey ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Panggil antrian</h2>
          <p className="mb-4 text-sm text-slate-400">Memanggil tiket Menunggu tertua untuk tanggal hari ini.</p>
          <CallNextButton />
        </section>
      ) : null}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Daftar {dateKey}</h2>
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            {Array.from(statusCounts, ([status, count]) => (
              <span key={status} className="rounded-full border border-slate-700 px-3 py-1">
                {isQueueStatus(status) ? queueStatusLabels[status] : status}: {count}
              </span>
            ))}
          </div>
        </div>
        {tickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">Belum ada antrian pada tanggal ini.</div>
        ) : tickets.map((ticket) => (
          <article key={ticket.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-2xl font-black text-amber-300">{ticket.queueNumber}</p>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">
                    {isQueueStatus(ticket.status) ? queueStatusLabels[ticket.status] : ticket.status}
                  </span>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs">{ticket.source === "WALK_IN" ? "Walk-in" : "Online"}</span>
                </div>
                <p className="mt-3 font-semibold">{ticket.customer.name} <span className="font-normal text-slate-400">· {ticket.customer.email}</span></p>
                <p className="mt-1 text-sm text-slate-300">{ticket.vehicle.plateNumber} · {ticket.vehicle.brand} {ticket.vehicle.model} · {ticket.serviceType.name}</p>
                <p className="mt-2 text-sm text-slate-400">{ticket.complaint}</p>
                <p className="mt-2 text-xs text-slate-500">Mekanik: {ticket.mechanic?.name ?? "Belum ditugaskan"}</p>
                {ticket.notes ? <p className="mt-1 text-sm text-slate-400">Catatan: {ticket.notes}</p> : null}
              </div>
              <div className="min-w-0 lg:w-80">
                {isQueueStatus(ticket.status) ? (
                  <AdminQueueActions
                    ticketId={ticket.id}
                    status={ticket.status}
                    mechanics={mechanics}
                    assignedMechanicId={ticket.mechanicId}
                  />
                ) : <p className="text-sm text-slate-500">Tiket telah ditutup.</p>}
              </div>
            </div>
          </article>
        ))}
      </section>
      <p className="text-sm"><Link href="/admin" className="text-amber-300 hover:underline">Kembali ke dashboard</Link></p>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(date);
}
