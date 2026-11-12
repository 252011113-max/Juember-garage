import { isQueueStatus, queueStatusLabels } from "@/lib/queue/status";

const statusColors: Record<string, string> = {
  WAITING: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  CALLED: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  IN_PROGRESS: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  DONE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  CANCELLED: "border-slate-600 bg-slate-800 text-slate-300",
  NO_SHOW: "border-red-400/30 bg-red-400/10 text-red-200",
};

export function QueueStatusBadge({ status }: { status: string }) {
  const validStatus = isQueueStatus(status) ? status : null;

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        validStatus
          ? statusColors[validStatus]
          : "border-red-900 bg-red-950 text-red-200"
      }`}
    >
      {validStatus ? queueStatusLabels[validStatus] : "Status tidak valid"}
    </span>
  );
}
