import { PrismaClient } from "@prisma/client";
import { env } from "~/env.mjs";
import { PineconeClient } from "@pinecone-database/pinecone";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

let pinecone: PineconeClient | undefined;
async function initializePinecone() {
  pinecone = new PineconeClient();
  await pinecone.init({
    apiKey: process.env.PINECONE_API_KEY as string,
    environment: process.env.PINECONE_ENVIRONMENT as string,
  });

  return pinecone;
}

export async function getPineconeClient() {
  if (!pinecone) {
    pinecone = await initializePinecone();
  }

  return pinecone;
}
