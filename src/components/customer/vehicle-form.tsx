"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { saveCustomerVehicle } from "@/app/customer/actions";
import { FieldError, FormMessage } from "@/components/customer/profile-form";
import {
  vehicleSchema,
  type VehicleInput,
} from "@/lib/validation/customer";

export type EditableVehicle = {
  id: string;
  plateNumber: string;
  type: "MOTOR" | "CAR";
  brand: string;
  model: string;
  year: number;
};

type VehicleFormProps = {
  vehicle?: EditableVehicle;
};

const emptyValues: VehicleInput = {
  plateNumber: "",
  type: "MOTOR",
  brand: "",
  model: "",
  year: String(new Date().getFullYear()),
};

export function VehicleForm({ vehicle }: VehicleFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle
      ? {
          plateNumber: vehicle.plateNumber,
          type: vehicle.type,
          brand: vehicle.brand,
          model: vehicle.model,
          year: String(vehicle.year),
        }
      : emptyValues,
  });

  async function onSubmit(values: VehicleInput) {
    setMessage("");
    const result = await saveCustomerVehicle(values, vehicle?.id);
    setMessage(result.message);
    setSuccess(result.ok);
    if (result.ok) {
      if (!vehicle) {
        reset(emptyValues);
      }
      router.refresh();
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <label className="block text-sm font-medium">
        Plat nomor
        <input
          {...register("plateNumber")}
          autoComplete="off"
          maxLength={15}
          placeholder="B 1234 ABC"
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 uppercase outline-none focus:border-amber-400"
        />
        <FieldError message={errors.plateNumber?.message} />
      </label>
      <label className="block text-sm font-medium">
        Jenis kendaraan
        <select
          {...register("type")}
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
        >
          <option value="MOTOR">Motor</option>
          <option value="CAR">Mobil</option>
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Merek
          <input
            {...register("brand")}
            maxLength={50}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
          />
          <FieldError message={errors.brand?.message} />
        </label>
        <label className="block text-sm font-medium">
          Model
          <input
            {...register("model")}
            maxLength={50}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400"
          />
          <FieldError message={errors.model?.message} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Tahun
        <input
          {...register("year")}
          inputMode="numeric"
          maxLength={4}
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-amber-400 sm:max-w-40"
        />
        <FieldError message={errors.year?.message} />
      </label>
      {message ? <FormMessage message={message} success={success} /> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 rounded-lg bg-amber-400 px-5 font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-60"
      >
        {isSubmitting
          ? "Menyimpan..."
          : vehicle
            ? "Simpan perubahan"
            : "Tambah kendaraan"}
      </button>
    </form>
  );
}
