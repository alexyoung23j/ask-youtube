import { PrismaClient } from "@prisma/client";
import { env } from "~/env.mjs";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PubSub, Message } from "@google-cloud/pubsub";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const pinecone = new PineconeClient();
async function initClient() {
  await pinecone.init({
    apiKey: process.env.PINECONE_API_KEY!,
    environment: process.env.PINECONE_ENVIRONMENT!,
  });
}

initClient().catch((e) => {
  console.log(e);
  process.exit(1);
});
