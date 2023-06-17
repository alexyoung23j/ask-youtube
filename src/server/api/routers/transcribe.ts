import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import ytdl from "ytdl-core";
import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import type { PrerecordedTranscriptionResponse } from "@deepgram/sdk/dist/types";
import { Deepgram } from "@deepgram/sdk";
import { TRPCError } from "@trpc/server";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";

import axios from "axios";

export const transcriptionRouter = createTRPCRouter({
  startTranscriptionJob: publicProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { url } = input;

      const existingVideo = await ctx.prisma.video.findFirst({
        where: {
          url: url,
        },
      });

      if (existingVideo) {
        // Handle differently
        console.log("video already exists in db");
        return;
      }

      try {
        void axios.post(process.env.CLOUD_FUNCTION_URL as string, { url: url });
        console.log("fired off transcription job");
      } catch (e) {
        console.log(e);
      }
    }),
});
