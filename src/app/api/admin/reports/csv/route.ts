import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getReportDateRange,
  isReportPeriod,
  type ReportPeriod,
} from "@/lib/reports/date-range";
import { isQueueStatus, queueStatusLabels } from "@/lib/queue/status";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ message: "Silakan masuk untuk mengakses laporan." }, { status: 401 });
  }
  const account = await prisma.user.findFirst({
    where: { id: session.user.id, role: "ADMIN", isActive: true },
    select: { id: true },
  });
  if (!account) {
    return Response.json({ message: "Akses admin diperlukan." }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedPeriod = url.searchParams.get("period") ?? "daily";
  if (!isReportPeriod(requestedPeriod)) {
    return Response.json({ message: "Periode laporan tidak valid." }, { status: 400 });
  }
  const period: ReportPeriod = requestedPeriod;
  const range = getReportDateRange(period);
  const tickets = await prisma.queueTicket.findMany({
    where: { queueDate: { gte: range.start, lt: range.end } },
    orderBy: [{ queueDate: "asc" }, { createdAt: "asc" }],
    include: {
      customer: { select: { name: true, email: true } },
      vehicle: { select: { plateNumber: true } },
      serviceType: { select: { name: true } },
      mechanic: { select: { name: true } },
    },
  });

  const rows = [
    [
      "Tanggal",
      "Nomor Antrian",
      "Pelanggan",
      "Email",
      "Plat Nomor",
      "Jenis Servis",
      "Status",
      "Mekanik",
      "Sumber",
      "Keluhan",
      "Catatan Servis",
      "Biaya",
    ],
    ...tickets.map((ticket) => [
      ticket.queueDate.toISOString().slice(0, 10),
      ticket.queueNumber,
      ticket.customer.name,
      ticket.customer.email,
      ticket.vehicle.plateNumber,
      ticket.serviceType.name,
      isQueueStatus(ticket.status) ? queueStatusLabels[ticket.status] : ticket.status,
      ticket.mechanic?.name ?? "",
      ticket.source,
      ticket.complaint,
      ticket.notes ?? "",
      ticket.totalCost?.toString() ?? "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${period}-${range.startKey}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function escapeCsv(value: string): string {
  const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}
