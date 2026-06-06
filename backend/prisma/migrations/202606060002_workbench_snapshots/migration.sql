-- CreateTable
CREATE TABLE "workbench_snapshots" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataThroughDate" TIMESTAMP(3),
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workbench_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workbench_snapshots_instrumentId_key" ON "workbench_snapshots"("instrumentId");

-- CreateIndex
CREATE INDEX "workbench_snapshots_instrumentId_idx" ON "workbench_snapshots"("instrumentId");

-- CreateIndex
CREATE INDEX "workbench_snapshots_computedAt_idx" ON "workbench_snapshots"("computedAt");

-- AddForeignKey
ALTER TABLE "workbench_snapshots" ADD CONSTRAINT "workbench_snapshots_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
