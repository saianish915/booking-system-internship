/*
  Warnings:

  - You are about to drop the column `timeRange` on the `Event` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "event_timerange_gist";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "timeRange";
