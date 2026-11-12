"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reviewAdminQueueRequest } from "@/app/admin/actions";
import type { ActionResult } from "@/lib/actions";

export function QueueRequestActions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  async function review(decision: "APPROVE" | "REJECT") {
    if (
      decision === "REJECT" &&
      !window.confirm("Tolak permintaan antrian ini?")
    ) {
      return;
    }

    setPending(true);
    setResult(null);
    try {
      const response = await reviewAdminQueueRequest({ requestId, decision });
      setResult(response);
      if (response.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void review("APPROVE")}
          className="min-h-10 rounded-lg bg-emerald-500 px-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {pending ? "Memproses..." : "Terima"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void review("REJECT")}
          className="min-h-10 rounded-lg border border-rose-900 px-3 text-sm font-semibold text-rose-200 hover:border-rose-500 disabled:opacity-60"
        >
          Tolak
        </button>
      </div>
      {result ? (
        <p
          className={`text-sm ${result.ok ? "text-emerald-300" : "text-rose-300"}`}
          role="status"
        >
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
