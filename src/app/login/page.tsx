import { LoginForm } from "./login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <Link href="/" className="text-sm font-bold text-amber-400">
          ← Bengkel Antrian
        </Link>
        <h1 className="mt-8 text-2xl font-bold">Masuk ke akun</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Gunakan akun pelanggan, mekanik, atau admin yang terdaftar.
        </p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-slate-400">
          Belum memiliki akun?{" "}
          <Link
            href="/register"
            className="font-semibold text-amber-300 hover:text-amber-200"
          >
            Daftar pelanggan
          </Link>
        </p>
      </section>
    </main>
  );
}
