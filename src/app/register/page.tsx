import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center sm:p-8">
        <p className="text-sm font-bold text-amber-400">BENGKEL ANTRIAN</p>
        <h1 className="mt-5 text-2xl font-bold">Pendaftaran pelanggan</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Buat akun pelanggan untuk mengelola kendaraan dan mengambil antrian
          servis.
        </p>
        <RegisterForm />
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 px-5 text-sm font-semibold hover:border-amber-400"
        >
          Kembali ke beranda
        </Link>
      </section>
    </main>
  );
}
