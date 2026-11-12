"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { updateCustomerProfile } from "@/app/customer/actions";
import {
  profileSchema,
  type ProfileInput,
} from "@/lib/validation/customer";

type ProfileFormProps = {
  name: string;
  phone: string;
};

export function ProfileForm({ name, phone }: ProfileFormProps) {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, phone },
  });

  async function onSubmit(values: ProfileInput) {
    setMessage("");
    const result = await updateCustomerProfile(values);
    setMessage(result.message);
    setSuccess(result.ok);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <label className="block text-sm font-medium">
        Nama lengkap
        <input
          {...register("name")}
          autoComplete="name"
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
        />
        <FieldError message={errors.name?.message} />
      </label>
      <label className="block text-sm font-medium">
        Nomor HP
        <input
          {...register("phone")}
          type="tel"
          autoComplete="tel"
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
        />
        <FieldError message={errors.phone?.message} />
      </label>
      {message ? (
        <FormMessage message={message} success={success} />
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 rounded-lg bg-amber-400 px-5 font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-60"
      >
        {isSubmitting ? "Menyimpan..." : "Simpan profil"}
      </button>
    </form>
  );
}

export function FormMessage({
  message,
  success,
}: {
  message: string;
  success: boolean;
}) {
  return (
    <p
      role={success ? "status" : "alert"}
      className={`rounded-lg border p-3 text-sm ${
        success
          ? "border-emerald-900 bg-emerald-950/60 text-emerald-200"
          : "border-red-900 bg-red-950/60 text-red-200"
      }`}
    >
      {message}
    </p>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? (
    <span className="mt-1 block text-xs text-red-300">{message}</span>
  ) : null;
}
