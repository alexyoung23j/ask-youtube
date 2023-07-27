/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  protectedProcedureWithUploadLimit,
  publicProcedure,
} from "~/server/api/trpc";
import ytdl from "ytdl-core";
import axios from "axios";
import { parseYouTubeURL } from "~/utils/helpers";
import { TRPCError } from "@trpc/server";
import xml2js from "xml2js";
import { Document } from "langchain/document";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import he from "he";

// Duplicate of type in TranscriptViewer.tsx
export interface TextChunk {
  start: number;
  end: number;
  text: string;
}

export interface ChunkGroup {
  start: number;
  end: number;
  num_words: number;
  sentences: Array<TextChunk>;
}

function parseYoutubeTranscript(transcript: {
  text: Array<{ _: string; start: Array<string>; dur: Array<string> }>;
}): Array<ChunkGroup> {
  const chunkGroups: Array<ChunkGroup> = [];

  for (let i = 0; i < transcript.text.length; i += 12) {
    const chunkGroup: ChunkGroup = {
      start: 0,
      end: 0,
      num_words: 0,
      sentences: [],
    };

    for (let j = i; j < i + 12 && j < transcript.text.length; j += 4) {
      const sentence: TextChunk = { start: 0, end: 0, text: "" };

      for (let k = j; k < j + 4 && k < transcript.text.length; k++) {
        const textChunk = transcript.text[k];
        const start = parseFloat(
          parseFloat(textChunk?.start[0] as string).toFixed(2)
        );
        const end = parseFloat(
          (start + parseFloat(textChunk?.dur[0] as string)).toFixed(2)
        );
        const text = textChunk?._
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            he.decode(textChunk._)
          : ("" as string);

        sentence.text += (text as string) + " ";
        sentence.start = sentence.start === 0 ? start : sentence.start;
        sentence.end = end;
        chunkGroup.num_words += (text as string).split(" ").length;
      }

      sentence.text = sentence.text.trim();
      chunkGroup.sentences.push(sentence);
      chunkGroup.start =
        chunkGroup.start === 0 ? sentence.start : chunkGroup.start;
      chunkGroup.end = sentence.end;
    }

    chunkGroups.push(chunkGroup);
  }

  return chunkGroups;
}

async function getYoutubeTranscript(
  videoInfo: ytdl.videoInfo
): Promise<Array<ChunkGroup>> {
  const captionTracks =
    videoInfo?.player_response?.captions?.playerCaptionsTracklistRenderer
      .captionTracks;

  if (!captionTracks) {
    throw new Error("No caption tracks found");
  }

  const englishTrackIndex = captionTracks.findIndex(
    (track) => track.languageCode === "en"
  );

  if (englishTrackIndex === -1) {
    throw new Error("No English caption track found");
  }

  const captionUrl = captionTracks[englishTrackIndex]?.baseUrl;
  if (!captionUrl) {
    throw new Error("No caption url found");
  }

  try {
    const captionResponse = await axios.get(captionUrl);
    if (captionResponse.data) {
      // Parse XML
      const xml = captionResponse.data;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await xml2js.parseStringPromise(xml, { mergeAttrs: true });

      // `result` is a JavaScript object
      // convert it to a JSON string
      const json: {
        transcript: {
          text: Array<{
            _: string;
            start: Array<string>;
            dur: Array<string>;
          }>;
        };
      } = JSON.parse(JSON.stringify(result));

      const res = parseYoutubeTranscript(json.transcript);

      return res;
    } else {
      throw new Error("Unable to parse caption track");
    }
  } catch (e) {
    console.log(e);
    throw new Error("Unable to parse caption track");
  }
}

async function writeEmbeddingDocuments(
  paragraphs: Array<ChunkGroup>,
  videoUrl: string,
  callback: (videoUrl: string) => Promise<void>
) {
  const documents = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];

    if (!paragraph) {
      continue;
    }

    for (let j = 0; j < paragraph.sentences.length; j++) {
      const sentence = paragraph.sentences[j];
      documents.push(
        new Document({
          metadata: {
            start: sentence?.start,
            url: videoUrl,
            end: sentence?.end,
            paragraphIndex: i,
            sentenceIndex: j,
          },
          pageContent: sentence?.text as string,
        })
      );
    }
  }

  const supabaseClient = createSupabaseClient(
    process.env.EMBEDDING_DB_URL as string,
    process.env.EMBEDDING_DB_KEY as string
  );

  try {
    await SupabaseVectorStore.fromDocuments(documents, new OpenAIEmbeddings(), {
      client: supabaseClient,
      tableName: "documents",
      queryName: "match_documents",
    });
    await callback(videoUrl);
  } catch (e) {
    console.log(e);
  }
}

export const transcriptionRouter = createTRPCRouter({
  startTranscriptionJob: protectedProcedureWithUploadLimit
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { url } = input;
      let parsedUrl;

      try {
        parsedUrl = parseYouTubeURL(url);
      } catch (e) {
        console.log(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid url",
        });
      }

      const existingVideo = await ctx.prisma.video.findFirst({
        where: {
          url: parsedUrl,
        },
      });

      if (existingVideo) {
        // Handle differently
        const existingUserVideoConnection =
          await ctx.prisma.userConnectedVideos.findFirst({
            where: {
              userId: ctx.session?.user?.id,
              videoUrl: existingVideo.url,
            },
          });

        if (!existingUserVideoConnection) {
          // Create connection
          await ctx.prisma.userConnectedVideos.create({
            data: {
              userId: ctx.session?.user?.id,
              videoUrl: existingVideo.url,
            },
          });
        }

        await ctx.prisma.user.update({
          where: {
            id: ctx.session?.user?.id,
          },
          data: {
            numUploadedVideos: {
              increment: 1,
            },
          },
        });
        return existingVideo;
      }

      const videoInfo = await ytdl.getInfo(url);

      if (parseInt(videoInfo?.videoDetails?.lengthSeconds) > 9000) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Video is too long",
        });
      }

      const newVideo = await ctx.prisma.video.create({
        data: {
          url: parsedUrl,
          title: videoInfo.videoDetails.title,
          length: parseInt(videoInfo.videoDetails.lengthSeconds),
        },
      });

      try {
        // Create connection
        await ctx.prisma.userConnectedVideos.create({
          data: {
            userId: ctx.session?.user?.id,
            videoUrl: newVideo.url,
          },
        });
        // Update user count
        await ctx.prisma.user.update({
          where: {
            id: ctx.session?.user?.id,
          },
          data: {
            numUploadedVideos: {
              increment: 1,
            },
          },
        });

        // Try to use the existing video transcript
        try {
          const transcript = await getYoutubeTranscript(videoInfo);
          // Non Blocking call
          void writeEmbeddingDocuments(
            transcript,
            newVideo.url,
            async (videoUrl: string) => {
              await ctx.prisma.video.update({
                where: {
                  url: videoUrl,
                },
                data: {
                  transcription: JSON.parse(JSON.stringify(transcript)),
                },
              });
            }
          );
          console.log("Obtained transcription", new Date());
        } catch (e) {
          console.log(e);
          void axios.post(process.env.CLOUD_FUNCTION_URL as string, {
            url: parsedUrl,
          });
          console.log("fired off transcription job", new Date());
        }

        return newVideo;
      } catch (e) {
        console.log(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to make transcription request",
        });
      }
    }),
});
