"use strict";
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-misused-promises */
// import type { Request, Response } from "express";
// import { PubSub, Message } from "@google-cloud/pubsub";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcriptionJob = void 0;
const transcriptionJob = async (req, res) => {
    const { data } = req.body;
    console.log("Received HTTP request:", data);
    if (!data) {
        console.log("Request body does not contain data field");
        return res.status(400).send("Bad Request");
    }
    try {
        // Process the data received in the HTTP request
        const videoUrl = JSON.parse(data).url;
        console.log("Processing video:", videoUrl);
        // Do the video processing
        await new Promise((resolve) => setTimeout(resolve, 5000));
        res.status(200).send("Video processing completed.");
    }
    catch (e) {
        console.log("Error processing request:", e);
        res.status(500).send("Internal Server Error");
    }
};
exports.transcriptionJob = transcriptionJob;
