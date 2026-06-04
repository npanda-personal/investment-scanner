-- AlterTable: add nullable lastObservedDirection for SIGNAL_DIRECTION_CHANGED prior-state memory
ALTER TABLE "alert_rules" ADD COLUMN "lastObservedDirection" TEXT;
