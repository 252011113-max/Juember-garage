"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCustomerVehicle } from "@/app/customer/actions";

export function DeleteVehicleButton({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Yakin ingin menghapus kendaraan ini?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCustomerVehicle(vehicleId);
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="min-h-10 rounded-lg border border-red-900 px-4 text-sm font-semibold text-red-300 hover:bg-red-950 disabled:opacity-60"
      >
        {isPending ? "Menghapus..." : "Hapus kendaraan"}
      </button>
      {message ? (
        <p
          role="status"
          className="mt-2 text-sm text-slate-300"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
