CREATE TABLE "QueueRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueNumber" TEXT NOT NULL,
    "queueDate" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "complaint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedTicketId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QueueRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QueueRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QueueRequest_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QueueRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QueueRequest_approvedTicketId_fkey" FOREIGN KEY ("approvedTicketId") REFERENCES "QueueTicket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "QueueRequest_approvedTicketId_key" ON "QueueRequest"("approvedTicketId");
CREATE UNIQUE INDEX "QueueRequest_queueDate_queueNumber_key" ON "QueueRequest"("queueDate", "queueNumber");
CREATE INDEX "QueueRequest_queueDate_status_createdAt_idx" ON "QueueRequest"("queueDate", "status", "createdAt");
CREATE INDEX "QueueRequest_customerId_queueDate_idx" ON "QueueRequest"("customerId", "queueDate");

CREATE TABLE "ActiveVehicleQueue_new" (
    "vehicleId" TEXT NOT NULL,
    "queueDate" DATETIME NOT NULL,
    "ticketId" TEXT,
    "requestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("vehicleId", "queueDate"),
    CONSTRAINT "ActiveVehicleQueue_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActiveVehicleQueue_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "QueueTicket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActiveVehicleQueue_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "QueueRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "ActiveVehicleQueue_new" ("vehicleId", "queueDate", "ticketId", "createdAt")
SELECT "vehicleId", "queueDate", "ticketId", "createdAt"
FROM "ActiveVehicleQueue";

DROP TABLE "ActiveVehicleQueue";
ALTER TABLE "ActiveVehicleQueue_new" RENAME TO "ActiveVehicleQueue";
CREATE UNIQUE INDEX "ActiveVehicleQueue_ticketId_key" ON "ActiveVehicleQueue"("ticketId");
CREATE UNIQUE INDEX "ActiveVehicleQueue_requestId_key" ON "ActiveVehicleQueue"("requestId");
