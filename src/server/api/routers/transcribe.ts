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
import { PineconeClient } from "@pinecone-database/pinecone";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { PubSub } from "@google-cloud/pubsub";

function deleteFile(filePath: string): void {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error while deleting file ${filePath}:`, err);
    } else {
      console.log(`Successfully deleted file ${filePath}`);
    }
  });
}

const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY!);
const mimetype = "audio/wav";

const pubsub = new PubSub();
const topicName = "transcription-job";

export const transcriptionRouter = createTRPCRouter({
  startTranscriptionJob: publicProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { url } = input;

      const data = JSON.stringify({ url: url });

      try {
        const topic = pubsub.topic(topicName);
        await topic.publishMessage({ data });
        console.log("Message published to Pub/Sub.");
      } catch (error) {
        console.error("Error publishing message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to start transcription job",
        });
      }
    }),
  generateTranscription: publicProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { url } = input;
      const outputFilePath = path.join(os.tmpdir(), "output.mp3");
      console.log(`Downloading video from ${url}`, new Date());

      const previousTranscript = await ctx.prisma.video.findFirst({
        where: {
          url: url,
        },
      });

      if (previousTranscript) {
        // Already have a transcript for this video
        return {};
      }

      let stream;

      try {
        stream = ytdl(url, {
          quality: "highestaudio",
          filter: "audioonly",
        });
      } catch (e) {
        console.log(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to download",
        });
      }

      try {
        const converter = ffmpeg(stream).format("mp3");
        const fileStream = fs.createWriteStream(outputFilePath);
        converter.pipe(fileStream);

        // Return a new Promise that resolves when the file is done being written
        await new Promise<void>((resolve, reject) => {
          fileStream.on("finish", () => {
            console.log(`Video saved to ${outputFilePath}`, new Date());
            resolve();
          });
          fileStream.on("error", reject);
        });

        const audio = fs.readFileSync(outputFilePath);

        // Set the source
        const source = {
          buffer: audio,
          mimetype: mimetype,
        };

        console.log("starting transcription", new Date());
        const transcriptionResp: PrerecordedTranscriptionResponse =
          (await deepgram.transcription.preRecorded(source, {
            smart_format: true,
            model: "nova",
            punctuate: true,
            times: true,
            paragraphs: true,
          })) as PrerecordedTranscriptionResponse;

        console.log("transcription complete", new Date());

        const paragraphs =
          transcriptionResp?.results?.channels[0]?.alternatives[0]?.paragraphs
            ?.paragraphs;

        if (!paragraphs) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to transcribe",
          });
        }

        const documents = [];

        for (let i = 0; i < paragraphs.length; i++) {
          const paragraph = paragraphs[i];

          if (!paragraph) {
            continue;
          }

          for (const sentence of paragraph.sentences) {
            documents.push(
              new Document({
                metadata: {
                  start: sentence.start,
                  url: url,
                  end: sentence.end,
                  paragraphIndex: i,
                },
                pageContent: sentence.text,
              })
            );
          }
        }

        const pineconeIndex = ctx.pinecone.Index(process.env.PINECONE_INDEX!);

        await PineconeStore.fromDocuments(documents, new OpenAIEmbeddings(), {
          pineconeIndex,
        });

        await ctx.prisma.video.create({
          data: {
            url: url,
            transcription: paragraphs ?? {},
            title: "test",
            length: 100,
          },
        });

        deleteFile(outputFilePath);
      } catch (e) {
        console.log(e);
        deleteFile(outputFilePath);
      }

      return {};
    }),
});
