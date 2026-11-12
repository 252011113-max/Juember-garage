import { SignOutButton } from "@/components/sign-out-button";

export default function InactiveAccountPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center sm:p-8">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-400">
          Akses akun
        </p>
        <h1 className="mt-4 text-2xl font-bold">Akun tidak dapat diakses</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Status akun atau hak akses telah berubah. Keluar lalu hubungi bengkel
          untuk mendapatkan bantuan.
        </p>
        <div className="mt-6 flex justify-center">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
