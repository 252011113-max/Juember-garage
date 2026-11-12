"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { registerCustomer } from "@/app/register/actions";
import {
  customerRegistrationSchema,
  type CustomerRegistrationInput,
} from "@/lib/validation/customer";

export function RegisterForm() {
  const [resultMessage, setResultMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerRegistrationInput>({
    resolver: zodResolver(customerRegistrationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: CustomerRegistrationInput) {
    setResultMessage("");
    setIsSuccess(false);
    const result = await registerCustomer(values);
    setResultMessage(result.message);
    setIsSuccess(result.ok);
  }

  return (
    <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <label className="block text-sm font-medium">
        Nama lengkap
        <input
          {...register("name")}
          autoComplete="name"
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
        />
        {errors.name ? <FieldError message={errors.name.message} /> : null}
      </label>
      <label className="block text-sm font-medium">
        Email
        <input
          {...register("email")}
          type="email"
          autoComplete="email"
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
        />
        {errors.email ? <FieldError message={errors.email.message} /> : null}
      </label>
      <label className="block text-sm font-medium">
        Nomor HP
        <input
          {...register("phone")}
          type="tel"
          autoComplete="tel"
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
          placeholder="08xxxxxxxxxx"
        />
        {errors.phone ? <FieldError message={errors.phone.message} /> : null}
      </label>
      <label className="block text-sm font-medium">
        Kata sandi
        <input
          {...register("password")}
          type="password"
          autoComplete="new-password"
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
        />
        {errors.password ? (
          <FieldError message={errors.password.message} />
        ) : null}
      </label>
      <label className="block text-sm font-medium">
        Ulangi kata sandi
        <input
          {...register("confirmPassword")}
          type="password"
          autoComplete="new-password"
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
        />
        {errors.confirmPassword ? (
          <FieldError message={errors.confirmPassword.message} />
        ) : null}
      </label>
      {resultMessage ? (
        <div
          role={isSuccess ? "status" : "alert"}
          className={`rounded-lg border p-3 text-sm ${
            isSuccess
              ? "border-emerald-900 bg-emerald-950/60 text-emerald-200"
              : "border-red-900 bg-red-950/60 text-red-200"
          }`}
        >
          {resultMessage}
          {isSuccess ? (
            <Link
              href="/login"
              className="ml-1 font-semibold underline underline-offset-2"
            >
              Masuk sekarang
            </Link>
          ) : null}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-12 w-full rounded-lg bg-amber-400 px-4 font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Membuat akun..." : "Buat akun pelanggan"}
      </button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <span className="mt-1 block text-xs text-red-300">{message}</span>
  ) : null;
}
