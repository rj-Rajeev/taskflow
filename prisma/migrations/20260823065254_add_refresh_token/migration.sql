-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refresh_expires_at" TIMESTAMP(3),
ADD COLUMN     "refresh_token" TEXT;
