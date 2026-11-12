"use client";

import { useEffect, useState } from "react";

type DisplayTicket = {
  id: string;
  queueNumber: string;
  mechanic?: { name: string | null } | null;
  serviceType?: { name: string } | null;
};

type DisplayData = {
  date: string;
  serving: DisplayTicket[];
  called: DisplayTicket[];
  next: DisplayTicket[];
};

export function DisplayBoard() {
  const [data, setData] = useState<DisplayData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/display", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Status display tidak dapat dimuat.");
        }
        const current = (await response.json()) as DisplayData;
        if (active) {
          setData(current);
          setError("");
        }
      } catch {
        if (active) setError("Koneksi terputus. Status akan dicoba diperbarui kembali.");
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-400">Bengkel Antrian</p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">Informasi Antrian Servis</h1>
          </div>
          <p className="text-sm text-slate-400">{data ? `Tanggal ${data.date}` : "Memuat tanggal..."}</p>
        </header>
        {error ? <p role="status" className="mb-5 rounded-xl border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-200">{error}</p> : null}
        {!data ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400" role="status">
            Memuat informasi antrian...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <section className="rounded-3xl border border-amber-500/40 bg-slate-900 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-amber-300 sm:text-2xl">Sedang Dilayani</h2>
              {data.serving.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">Belum ada kendaraan yang sedang dikerjakan.</p>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {data.serving.map((ticket) => (
                    <article key={ticket.id} className="rounded-2xl bg-slate-950 p-5">
                      <p className="text-5xl font-black text-amber-300">{ticket.queueNumber}</p>
                      <p className="mt-3 text-sm text-slate-300">{ticket.serviceType?.name}</p>
                      <p className="mt-1 text-sm text-slate-400">Mekanik: {ticket.mechanic?.name ?? "Belum ditugaskan"}</p>
                    </article>
                  ))}
                </div>
              )}
              <h2 className="mt-8 text-lg font-bold text-sky-300">Nomor Dipanggil</h2>
              {data.called.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Tidak ada panggilan aktif.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-3">
                  {data.called.map((ticket) => (
                    <span key={ticket.id} className="rounded-xl border border-sky-900 bg-sky-950/40 px-5 py-3 text-2xl font-black text-sky-200">{ticket.queueNumber}</span>
                  ))}
                </div>
              )}
            </section>
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
              <h2 className="text-xl font-bold sm:text-2xl">5 Antrian Berikutnya</h2>
              {data.next.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">Tidak ada antrian menunggu.</p>
              ) : (
                <ol className="mt-5 space-y-3">
                  {data.next.map((ticket, index) => (
                    <li key={ticket.id} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-slate-300">{index + 1}</span>
                      <span className="text-3xl font-black text-amber-300">{ticket.queueNumber}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-slate-500">Informasi diperbarui otomatis setiap 8 detik. Estimasi antrian bukan janji waktu layanan.</p>
      </div>
    </main>
  );
}
