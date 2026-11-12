"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createCustomerQueueTicket } from "@/app/customer/actions";
import { FieldError, FormMessage } from "@/components/customer/profile-form";
import {
  queueTicketSchema,
  type QueueTicketInput,
} from "@/lib/validation/customer";

type QueueFormProps = {
  vehicles: { id: string; plateNumber: string; brand: string; model: string }[];
  services: { id: string; name: string; estimatedMinutes: number; basePrice: number }[];
  today: string;
  maxDate: string;
  afterHours: boolean;
  tomorrow: string;
};

export function QueueForm({
  vehicles,
  services,
  today,
  maxDate,
  afterHours,
  tomorrow,
}: QueueFormProps) {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<{
    id: string;
    number: string;
    isRequest: boolean;
  } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QueueTicketInput>({
    resolver: zodResolver(queueTicketSchema),
    defaultValues: {
      vehicleId: "",
      serviceTypeId: "",
      queueDate: afterHours ? tomorrow : today,
      complaint: "",
    },
  });

  async function onSubmit(values: QueueTicketInput) {
    setMessage("");
    setCreatedTicket(null);
    const result = await createCustomerQueueTicket(values);
    setMessage(result.message);
    setSuccess(result.ok);
    if (result.ok && result.queueNumber && result.ticketId) {
      setCreatedTicket({
        id: result.ticketId,
        number: result.queueNumber,
        isRequest: false,
      });
    } else if (result.ok && result.queueNumber && result.requestId) {
      setCreatedTicket({
        id: result.requestId,
        number: result.queueNumber,
        isRequest: true,
      });
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {afterHours ? (
        <p className="rounded-xl border border-amber-900 bg-amber-950/40 p-4 text-sm leading-6 text-amber-100">
          Bengkel sudah tutup. Permintaan untuk besok akan menunggu persetujuan
          admin sebelum nomor antrian berlaku.
        </p>
      ) : null}
      <label className="block text-sm font-medium">
        Kendaraan
        <select
          {...register("vehicleId")}
          className="mt-2 min-h-12 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
        >
          <option value="">Pilih kendaraan</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.plateNumber} · {vehicle.brand} {vehicle.model}
            </option>
          ))}
        </select>
        <FieldError message={errors.vehicleId?.message} />
      </label>
      <label className="block text-sm font-medium">
        Jenis servis
        <select
          {...register("serviceTypeId")}
          className="mt-2 min-h-12 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
        >
          <option value="">Pilih jenis servis</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} · sekitar {service.estimatedMinutes} menit ·{" "}
              {formatCurrency(service.basePrice)}
            </option>
          ))}
        </select>
        <FieldError message={errors.serviceTypeId?.message} />
      </label>
      <label className="block text-sm font-medium">
        Tanggal antrian
        <input
          {...register("queueDate")}
          type="date"
          min={afterHours ? tomorrow : today}
          max={afterHours ? tomorrow : maxDate}
          className="mt-2 min-h-12 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
        />
        <FieldError message={errors.queueDate?.message} />
      </label>
      <label className="block text-sm font-medium">
        Keluhan kendaraan
        <textarea
          {...register("complaint")}
          rows={4}
          maxLength={1000}
          placeholder="Jelaskan keluhan kendaraan Anda"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-amber-400"
        />
        <FieldError message={errors.complaint?.message} />
      </label>
      <p className="text-xs leading-5 text-slate-400">
        Antrian tersedia hingga 7 hari ke depan. Permintaan setelah jam tutup
        untuk besok harus disetujui admin; estimasi waktu bukan janji.
      </p>
      {message ? <FormMessage message={message} success={success} /> : null}
      {createdTicket ? (
        <p className="text-sm text-emerald-200">
          {createdTicket.isRequest ? "Nomor sementara Anda " : "Nomor Anda "}
          <Link
            href={
              createdTicket.isRequest
                ? "/customer/riwayat"
                : `/customer/riwayat/${createdTicket.id}`
            }
            className="font-bold underline underline-offset-2"
          >
            {createdTicket.number}
          </Link>
          {createdTicket.isRequest
            ? " menunggu keputusan admin untuk antrian besok."
            : "."}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting || vehicles.length === 0 || services.length === 0}
        className="min-h-12 w-full rounded-lg bg-amber-400 px-5 font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Mengambil nomor..." : "Ambil nomor antrian"}
      </button>
    </form>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
