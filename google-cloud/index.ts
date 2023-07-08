/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Request, Response } from "express";
import ytdl from "ytdl-core";
import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import type { PrerecordedTranscriptionResponse } from "@deepgram/sdk/dist/types";
import { Deepgram } from "@deepgram/sdk";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { PineconeClient } from "@pinecone-database/pinecone";
import { Pool } from "pg";
import dotenv from "dotenv";
import pathToFfmpeg from "ffmpeg-static";
import { Storage } from "@google-cloud/storage";
import { Writable } from "stream";
import { v4 as uuidv4 } from "uuid";

const storage = new Storage();

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL as string,
  ssl: {
    rejectUnauthorized: false, // Only needed if your PostgreSQL server uses a self-signed certificate
  },
});

const pinecone = new PineconeClient();
async function initClient() {
  await pinecone.init({
    apiKey: process.env.PINECONE_API_KEY as string,
    environment: process.env.PINECONE_ENVIRONMENT as string,
  });
}

const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY as string);

const mimetype = "audio/mp3";

function deleteFile(filePath: string): void {
  fs.unlink(filePath, (err: any) => {
    if (err) {
      console.error(`Error while deleting file ${filePath}:`, err);
    } else {
      console.log(`Successfully deleted file ${filePath}`);
    }
  });
}

export const transcriptionJob = async (req: Request, res: Response) => {
  console.log("started job", new Date());
  const { url } = req.body;
  if (!url) {
    console.log("Request body does not contain data field");
    return res.status(400).send("Bad Request");
  }

  const videoUrl = url as string;

  await initClient();

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
  const fileName = `output-${uuidv4()}.mp3`;
  const file = storage.bucket(bucketName).file(fileName);

  ffmpeg.setFfmpegPath(pathToFfmpeg as string); // Set FFmpeg path

  // CONVERT TO MP3
  try {
    const converter = ffmpeg(stream).format("mp3");
    const writeStream = file.createWriteStream();
    converter.pipe(writeStream as Writable);

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

    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX as string);
    await PineconeStore.fromDocuments(documents, new OpenAIEmbeddings(), {
      pineconeIndex,
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

  res.status(200).send("OK");
};
