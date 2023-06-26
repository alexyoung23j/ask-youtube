-- CreateTable
CREATE TABLE "UserConnectedVideos" (
    "id" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConnectedVideos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserConnectedVideos" ADD CONSTRAINT "UserConnectedVideos_videoUrl_fkey" FOREIGN KEY ("videoUrl") REFERENCES "Video"("url") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConnectedVideos" ADD CONSTRAINT "UserConnectedVideos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
