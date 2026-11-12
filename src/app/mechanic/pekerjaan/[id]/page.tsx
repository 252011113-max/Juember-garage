import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CompleteWorkForm, StartWorkButton } from "@/components/mechanic/work-actions";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { requireRole } from "@/lib/auth/require-role";
import { isQueueStatus, queueStatusLabels } from "@/lib/queue/status";
import { prisma } from "@/lib/prisma";
import { resourceIdSchema } from "@/lib/validation/customer";

type MechanicWorkDetailProps = {
  params: Promise<{ id: string }>;
};

export default function MechanicWorkDetailPage({
  params,
}: MechanicWorkDetailProps) {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <MechanicWorkDetail params={params} />
    </Suspense>
  );
}

async function MechanicWorkDetail({ params }: MechanicWorkDetailProps) {
  const mechanic = await requireRole("MECHANIC");
  const { id } = await params;
  if (!resourceIdSchema.safeParse(id).success) notFound();

  const ticket = await prisma.queueTicket.findFirst({
    where: { id, mechanicId: mechanic.id },
    include: {
      customer: { select: { name: true, phone: true } },
      vehicle: {
        select: { plateNumber: true, type: true, brand: true, model: true, year: true },
      },
      serviceType: {
        select: { name: true, estimatedMinutes: true, basePrice: true },
      },
    },
  });
  if (!ticket) notFound();

  const parsedParts = parseParts(ticket.partsUsed);
  const isWorkInProgress = ticket.status === "IN_PROGRESS";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/mechanic/pekerjaan"
        className="inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
      >
        ← Kembali ke pekerjaan
      </Link>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Nomor antrian</p>
            <h1 className="mt-1 text-4xl font-black text-cyan-300">
              {ticket.queueNumber}
            </h1>
          </div>
          <span className="rounded-full border border-cyan-900 px-3 py-1 text-sm font-semibold text-cyan-200">
            {isQueueStatus(ticket.status)
              ? queueStatusLabels[ticket.status]
              : ticket.status}
          </span>
        </div>
        <dl className="mt-7 grid gap-5 sm:grid-cols-2">
          <DetailItem label="Tanggal antrian" value={formatDate(ticket.queueDate)} />
          <DetailItem label="Jenis servis" value={ticket.serviceType.name} />
          <DetailItem
            label="Kendaraan"
            value={`${ticket.vehicle.plateNumber} · ${ticket.vehicle.brand} ${ticket.vehicle.model} (${ticket.vehicle.year})`}
          />
          <DetailItem label="Jenis kendaraan" value={ticket.vehicle.type === "MOTOR" ? "Motor" : "Mobil"} />
          <DetailItem label="Pelanggan" value={ticket.customer.name} />
          <DetailItem label="No. HP" value={ticket.customer.phone ?? "Tidak tersedia"} />
          <DetailItem label="Keluhan" value={ticket.complaint} />
          <DetailItem
            label="Estimasi layanan"
            value={`${ticket.serviceType.estimatedMinutes} menit`}
          />
        </dl>
      </section>

      {ticket.status === "CALLED" ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Mulai pekerjaan</h2>
          <p className="my-3 text-sm text-slate-400">
            Pastikan kendaraan dan keluhan sudah diperiksa sebelum memulai servis.
          </p>
          <StartWorkButton ticketId={ticket.id} />
        </section>
      ) : null}

      {ticket.status === "WAITING" ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          Pekerjaan dapat dimulai setelah admin memanggil antrian.
        </p>
      ) : null}

      {isWorkInProgress ? (
        <section className="rounded-2xl border border-cyan-900/70 bg-slate-900 p-5 sm:p-6">
          <h2 className="text-xl font-bold">Catatan penyelesaian servis</h2>
          <p className="mb-5 mt-2 text-sm text-slate-400">
            Biaya akhir dihitung dari biaya jasa dan suku cadang.
          </p>
          <CompleteWorkForm
            ticketId={ticket.id}
            initialLaborCost={ticket.serviceType.basePrice}
          />
        </section>
      ) : null}

      {ticket.status === "DONE" ? (
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <h2 className="text-xl font-bold">Hasil pekerjaan</h2>
          <DetailItem label="Catatan servis" value={ticket.notes ?? "Belum ada catatan."} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Suku cadang yang digunakan
            </p>
            {parsedParts.error ? (
              <p className="mt-1 text-sm text-rose-300">
                Data suku cadang tidak dapat dibaca.
              </p>
            ) : parsedParts.items.length === 0 ? (
              <p className="mt-1 text-sm text-slate-300">Tidak ada suku cadang.</p>
            ) : (
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-300">
                {parsedParts.items.map((part, index) => (
                  <li key={`${part}-${index}`}>{part}</li>
                ))}
              </ul>
            )}
          </div>
          <dl className="grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-3">
            <DetailItem label="Biaya jasa" value={formatCurrency(ticket.laborCost)} />
            <DetailItem label="Biaya suku cadang" value={formatCurrency(ticket.partsCost)} />
            <DetailItem label="Total biaya" value={formatCurrency(ticket.totalCost)} />
          </dl>
        </section>
      ) : null}
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

function parseParts(value: string): { items: string[]; error: boolean } {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every((part) => typeof part === "string")
    ) {
      return { items: parsed, error: false };
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  return { items: [], error: true };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
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
