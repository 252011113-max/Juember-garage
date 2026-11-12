import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_65%)]" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <Link href="/" className="text-lg font-black tracking-tight text-amber-400">
          BENGKEL<span className="text-slate-100">ANTRIAN</span>
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-amber-400 hover:text-amber-300"
        >
          Masuk
        </Link>
      </header>
      <section className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-16">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            Sistem antrian servis kendaraan
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Servis lebih tertata.
            <span className="block text-amber-400">Waktu lebih terukur.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
            Ambil nomor antrian servis secara online dan pantau status kendaraan
            Anda dari satu tempat.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-amber-400 px-6 font-bold text-slate-950 transition hover:bg-amber-300"
            >
              Daftar sebagai pelanggan
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-700 px-6 font-bold text-slate-100 transition hover:border-slate-500"
            >
              Masuk ke akun
            </Link>
          </div>
        </div>
        <div className="mt-16 grid gap-4 border-t border-slate-800 pt-8 sm:grid-cols-3">
          {[
            ["01", "Antrian online", "Pilih kendaraan dan layanan servis."],
            ["02", "Status terpantau", "Pantau perkembangan pekerjaan."],
            ["03", "Layanan bengkel", "Informasi servis tersusun rapi."],
          ].map(([number, title, description]) => (
            <article
              key={number}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"
            >
              <span className="text-sm font-bold text-amber-400">{number}</span>
              <h2 className="mt-3 font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
      <footer className="relative border-t border-slate-900 py-5 text-center text-xs text-slate-500">
        Bengkel Antrian
      </footer>
    </main>
  );
}
