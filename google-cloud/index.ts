/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Request, Response } from "express";

export const transcriptionJob = async (req: Request, res: Response) => {
  const { data } = req.body;

  console.log("Received HTTP request:", data);

  if (!data) {
    console.log("Request body does not contain data field");
    return res.status(400).send("Bad Request");
  }

  try {
    // Process the data received in the HTTP request
    const videoUrl = JSON.parse(data as string).url;
    console.log("Processing video:", videoUrl);

    // Do the video processing

    await new Promise((resolve) => setTimeout(resolve, 5000));

    res.status(200).send("Video processing completed.");
  } catch (e) {
    console.log("Error processing request:", e);
    res.status(500).send("Internal Server Error");
  }
};
