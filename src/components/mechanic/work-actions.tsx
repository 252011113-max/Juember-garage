"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  completeMechanicWork,
  startMechanicWork,
} from "@/app/mechanic/actions";
import type { ActionResult } from "@/lib/actions";

function Feedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p
      className={`text-sm ${result.ok ? "text-emerald-300" : "text-rose-300"}`}
      role="status"
    >
      {result.message}
    </p>
  );
}

export function StartWorkButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  async function start() {
    setPending(true);
    setResult(null);
    try {
      const response = await startMechanicWork(ticketId);
      setResult(response);
      if (response.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => void start()}
        className="min-h-11 rounded-lg bg-cyan-400 px-4 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
      >
        {pending ? "Memulai..." : "Mulai pekerjaan"}
      </button>
      <Feedback result={result} />
    </div>
  );
}

export function CompleteWorkForm({
  ticketId,
  initialLaborCost,
}: {
  ticketId: string;
  initialLaborCost: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const partsUsed = String(data.get("partsUsed") ?? "")
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter(Boolean);

    setPending(true);
    setResult(null);
    try {
      const response = await completeMechanicWork({
        ticketId,
        notes: String(data.get("notes") ?? ""),
        partsUsed,
        laborCost: Number(data.get("laborCost")),
        partsCost: Number(data.get("partsCost")),
      });
      setResult(response);
      if (response.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-sm font-medium">
        Catatan servis
        <textarea
          required
          name="notes"
          minLength={5}
          maxLength={2000}
          rows={4}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-cyan-400"
          placeholder="Tuliskan pekerjaan dan hasil pemeriksaan."
        />
      </label>
      <label className="block text-sm font-medium">
        Suku cadang yang digunakan
        <textarea
          name="partsUsed"
          maxLength={3000}
          rows={3}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-cyan-400"
          placeholder="Satu jenis suku cadang per baris. Kosongkan jika tidak ada."
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Biaya jasa (Rp)
          <input
            required
            name="laborCost"
            type="number"
            min={0}
            max={1_000_000_000}
            step={1}
            defaultValue={initialLaborCost}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-cyan-400"
          />
        </label>
        <label className="block text-sm font-medium">
          Biaya suku cadang (Rp)
          <input
            required
            name="partsCost"
            type="number"
            min={0}
            max={1_000_000_000}
            step={1}
            defaultValue={0}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 outline-none focus:border-cyan-400"
          />
        </label>
      </div>
      <div className="space-y-3">
        <button
          disabled={pending}
          className="min-h-11 rounded-lg bg-cyan-400 px-4 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Selesaikan pekerjaan"}
        </button>
        <Feedback result={result} />
      </div>
    </form>
  );
}
