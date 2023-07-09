/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Request, Response } from "express";
import ytdl from "ytdl-core";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import type { PrerecordedTranscriptionResponse } from "@deepgram/sdk/dist/types";
import { Deepgram } from "@deepgram/sdk";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import dotenv from "dotenv";
import pathToFfmpeg from "ffmpeg-static";
import { Storage } from "@google-cloud/storage";
import type { Writable } from "stream";
import { v4 as uuidv4 } from "uuid";

const storage = new Storage();

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL as string,
  ssl: {
    rejectUnauthorized: false, // Only needed if your PostgreSQL server uses a self-signed certificate
  },
});

const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY as string);

export const transcriptionJob = async (req: Request, res: Response) => {
  console.log("started job", new Date());
  const startTime = process.hrtime();

  const { url } = req.body;
  if (!url) {
    console.log("Request body does not contain data field");
    return res.status(400).send("Bad Request");
  }

  const videoUrl = url as string;

  // PARSE DATA
  let stream;

  const videoInfo = await ytdl.getInfo(videoUrl);

  console.log("Starting video download", new Date());
  // DOWNLOAD VIDEO
  try {
    stream = ytdl(videoUrl, {
      quality: "lowestaudio",
      filter: "audioonly",
    });
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }

  const bucketName = "ask-youtube-dev-storage";
  const fileName = `output-${uuidv4()}`;
  const file = storage.bucket(bucketName).file(fileName);

  // CONVERT TO MP3
  try {
    const writeStream = file.createWriteStream();
    stream?.pipe(writeStream as Writable);

    // Return a new Promise that resolves when the file is done being written
    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => {
        console.log(`Video saved to ${bucketName}/${fileName}`, new Date());
        resolve();
      });
      writeStream.on("error", reject);
    });

    // Set the source
    const source = {
      url: `https://storage.googleapis.com/${bucketName}/${fileName}`,
    };

    console.log("starting transcription of ", videoUrl, new Date());
    const transcriptionResp: PrerecordedTranscriptionResponse =
      (await deepgram.transcription.preRecorded(source, {
        smart_format: true,
        model: "nova",
        video: true,
        punctuate: true,
        times: true,
        paragraphs: true,
      })) as PrerecordedTranscriptionResponse;
    console.log("transcription complete", new Date());

    const paragraphs =
      transcriptionResp?.results?.channels[0]?.alternatives[0]?.paragraphs
        ?.paragraphs;

    if (!paragraphs) {
      console.log("No paragraphs found");
      throw new Error("No paragraphs found");
    }

    // WRITE DOCUMENTS TO PINECONE
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

    console.log("starting document upload", new Date());

    const supabaseClient = createSupabaseClient(
      process.env.EMBEDDING_DB_URL as string,
      process.env.EMBEDDING_DB_KEY as string
    );

    await SupabaseVectorStore.fromDocuments(documents, new OpenAIEmbeddings(), {
      client: supabaseClient,
      tableName: "documents",
      queryName: "match_documents",
    });

    // Save to DB TODO: correct values
    const query = `
                    INSERT INTO "Video" (url, transcription, title, length, "createdAt", "updatedAt") 
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (url) DO UPDATE 
                    SET transcription = $2,
                        title = $3,
                        length = $4,
                        "updatedAt" = $6;
                  `;
    const values = [
      videoUrl,
      JSON.stringify(paragraphs),
      videoInfo.videoDetails.title,
      videoInfo.videoDetails.lengthSeconds,
      new Date(),
      new Date(),
    ];

    console.log("finished document upload", new Date());
    console.log("starting database write", new Date());

    const client = await pool.connect();
    await client.query(query, values);
    client.release();

    console.log("finished database write", new Date());

    await file.delete();
  } catch (e) {
    console.log(e);
    await file.delete();
    res.status(500).send("Internal Server Error");
  }

  const end = process.hrtime(startTime);
  const durationInSeconds = end[0] + end[1] / 1e9;

  console.log(
    `Finished transcription job in ${durationInSeconds} seconds for ${videoInfo.videoDetails.lengthSeconds} seconds of video`
  );

  res.status(200).send("OK");
};
