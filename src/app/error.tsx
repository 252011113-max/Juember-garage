"use client";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ reset }: AppErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 text-center">
        <p className="text-sm font-bold text-amber-400">Terjadi kendala</p>
        <h1 className="mt-3 text-2xl font-bold">Halaman tidak dapat dimuat</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Silakan coba muat ulang. Jika masalah berlanjut, hubungi pengelola
          bengkel.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-11 rounded-lg bg-amber-400 px-5 font-bold text-slate-950"
        >
          Coba lagi
        </button>
      </section>
    </main>
  );
}
