/*
  Warnings:

  - The `videoTimestamps` column on the `Message` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Message" DROP COLUMN "videoTimestamps",
ADD COLUMN     "videoTimestamps" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
