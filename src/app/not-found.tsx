import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 text-center">
        <p className="text-sm font-bold text-amber-400">404</p>
        <h1 className="mt-3 text-2xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-amber-400 px-5 font-bold text-slate-950"
        >
          Kembali ke beranda
        </Link>
      </section>
    </main>
  );
}
