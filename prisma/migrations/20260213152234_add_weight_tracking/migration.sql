-- CreateTable
CREATE TABLE "WeightTracking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightTracking_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WeightTracking" ADD CONSTRAINT "WeightTracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
