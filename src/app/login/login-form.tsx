"use client";

import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
        redirectTo: "/customer",
      });

      if (!result || result.error) {
        setErrorMessage(
          result?.error === "CredentialsSignin"
            ? "Email atau kata sandi salah, akun nonaktif, atau percobaan masuk dibatasi."
            : "Terjadi kendala saat masuk. Silakan coba lagi.",
        );
        return;
      }

      window.location.assign(result.url ?? "/customer");
    } catch {
      setErrorMessage("Koneksi bermasalah. Periksa jaringan lalu coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 outline-none transition focus:border-amber-400"
          placeholder="nama@email.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">
          Kata sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 outline-none transition focus:border-amber-400"
          placeholder="Masukkan kata sandi"
        />
      </div>
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-lg border border-red-900 bg-red-950/60 p-3 text-sm text-red-200"
        >
          {errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-12 w-full rounded-lg bg-amber-400 px-4 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Memeriksa akun..." : "Masuk"}
      </button>
    </form>
  );
}
