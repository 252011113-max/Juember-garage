"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelCustomerQueueTicket } from "@/app/customer/actions";

export function CancelTicketButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    if (!window.confirm("Yakin ingin membatalkan antrian ini?")) {
      return;
    }

    startTransition(async () => {
      const result = await cancelCustomerQueueTicket(ticketId);
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
        onClick={handleCancel}
        disabled={isPending}
        className="min-h-10 rounded-lg border border-red-900 px-4 text-sm font-semibold text-red-300 hover:bg-red-950 disabled:opacity-60"
      >
        {isPending ? "Memproses..." : "Batalkan antrian"}
      </button>
      {message ? (
        <p role="status" className="mt-2 text-sm text-slate-300">
          {message}
        </p>
      ) : null}
    </div>
  );
}
