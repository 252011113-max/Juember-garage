export const queueStatuses = [
  "WAITING",
  "CALLED",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
  "NO_SHOW",
] as const;

export type QueueStatus = (typeof queueStatuses)[number];

export const queueStatusLabels: Record<QueueStatus, string> = {
  WAITING: "Menunggu",
  CALLED: "Dipanggil",
  IN_PROGRESS: "Dikerjakan",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
  NO_SHOW: "Tidak Hadir",
};

export const activeQueueStatuses: readonly QueueStatus[] = [
  "WAITING",
  "CALLED",
  "IN_PROGRESS",
];

const transitions: Record<QueueStatus, readonly QueueStatus[]> = {
  WAITING: ["CALLED", "CANCELLED", "NO_SHOW"],
  CALLED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["DONE"],
  DONE: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function isQueueStatus(value: string): value is QueueStatus {
  return queueStatuses.some((status) => status === value);
}

export function isActiveQueueStatus(status: QueueStatus): boolean {
  return activeQueueStatuses.includes(status);
}

export function canTransitionQueueStatus(
  fromStatus: QueueStatus,
  toStatus: QueueStatus,
): boolean {
  return transitions[fromStatus].includes(toStatus);
}
