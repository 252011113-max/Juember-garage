"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { cancelCustomerQueueTicket } from "@/app/customer/actions";
import type { CustomerQueueItem } from "@/lib/queue/customer-overview";
import { queueStatusLabels } from "@/lib/queue/status";

type ActiveTicketsResponse = {
  tickets: CustomerQueueItem[];
  error?: string;
};

export function LiveQueue({
  initialTickets,
}: {
  initialTickets: CustomerQueueItem[];
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const refreshTickets = useCallback(async () => {
    try {
      const response = await fetch("/api/customer/tickets/active", {
        cache: "no-store",
      });
      const result = (await response.json()) as ActiveTicketsResponse;
      if (!response.ok) {
        setErrorMessage(result.error ?? "Status antrian tidak dapat diperbarui.");
        return;
      }
      setTickets(result.tickets);
      setErrorMessage("");
    } catch {
      setErrorMessage("Koneksi terputus. Status terakhir tetap ditampilkan.");
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let isStopped = false;

    const poll = async () => {
      await refreshTickets();
      if (!isStopped) {
        timer = setTimeout(poll, 8000);
      }
    };

    timer = setTimeout(poll, 8000);
    return () => {
      isStopped = true;
      clearTimeout(timer);
    };
  }, [refreshTickets]);

  function handleCancel(ticketId: string) {
    if (!window.confirm("Yakin ingin membatalkan antrian ini?")) {
      return;
    }

    setActionMessage("");
    startTransition(async () => {
      const result = await cancelCustomerQueueTicket(ticketId);
      setActionMessage(result.message);
      if (result.ok) {
        await refreshTickets();
      }
    });
  }

  return (
    <section className="space-y-4" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
            Pembaruan otomatis setiap 8 detik
          </p>
          <h2 className="mt-1 text-xl font-bold">Antrian aktif</h2>
        </div>
        <button
          type="button"
          onClick={() => void refreshTickets()}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:border-amber-400"
        >
          Perbarui sekarang
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="rounded-lg border border-amber-900 bg-amber-950/50 p-3 text-sm text-amber-200">
          {errorMessage}
        </p>
      ) : null}
      {actionMessage ? (
        <p role="status" className="text-sm text-slate-300">
          {actionMessage}
        </p>
      ) : null}
      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-center">
          <p className="font-semibold">
            Belum ada antrian aktif dalam 7 hari ke depan.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Anda dapat mengambil nomor antrian untuk kendaraan.
          </p>
          <Link
            href="/customer/antrian"
            className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-amber-400 px-4 text-sm font-bold text-slate-950"
          >
            Ambil antrian
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tickets.map((ticket) => (
            <article
              key={ticket.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Nomor antrian · {formatDate(ticket.queueDate)}
                  </p>
                  <p className="mt-1 text-3xl font-black text-amber-400">
                    {ticket.queueNumber}
                  </p>
                </div>
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">
                  {queueStatusLabels[ticket.status]}
                </span>
              </div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Kendaraan</dt>
                  <dd className="mt-1 font-medium">{ticket.vehicleLabel}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Jenis servis</dt>
                  <dd className="mt-1 font-medium">{ticket.serviceName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Posisi</dt>
                  <dd className="mt-1 font-medium">{ticket.position}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Estimasi waktu tunggu</dt>
                  <dd className="mt-1 font-medium">
                    {ticket.estimatedWaitMinutes === null
                      ? "Belum tersedia"
                      : `Sekitar ${ticket.estimatedWaitMinutes} menit`}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Mekanik</dt>
                  <dd className="mt-1 font-medium">
                    {ticket.mechanicName ?? "Belum ditugaskan"}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/customer/riwayat/${ticket.id}`}
                  className="inline-flex min-h-10 items-center rounded-lg border border-slate-700 px-4 text-sm font-semibold hover:border-amber-400"
                >
                  Lihat detail
                </Link>
                {ticket.status === "WAITING" ? (
                  <button
                    type="button"
                    onClick={() => handleCancel(ticket.id)}
                    disabled={isPending}
                    className="min-h-10 rounded-lg border border-red-900 px-4 text-sm font-semibold text-red-300 hover:bg-red-950 disabled:opacity-60"
                  >
                    {isPending ? "Memproses..." : "Batalkan"}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(dateKey: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}
