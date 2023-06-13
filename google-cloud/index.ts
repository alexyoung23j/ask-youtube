/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
import type { Request, Response } from "express";
import { PubSub, Message } from "@google-cloud/pubsub";

// Define a type for the data you're expecting in the Pub/Sub message
interface MessageData {
  url: string;
}

// Create an interface that extends the Message type and replaces `data` with your custom type
interface CustomMessage extends Omit<Message, "data"> {
  data: MessageData;
}

const pubsub = new PubSub();
const subscriptionName = "transcription-subscription";

export const getTranscription = async (
  message: CustomMessage,
  context: any
) => {
  // Process the message received from Pub/Sub
  const videoUrl = JSON.parse(message.data.toString()).url;
  console.log("Processing video:", videoUrl);

  // Do the video processing

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Acknowledge the message
  message.ack();
};

const subscribeToPubSub = () => {
  const subscription = pubsub.subscription(subscriptionName);

  subscription.on("message", async (message: CustomMessage) => {
    try {
      await getTranscription(message, {});
      console.log("Video processed successfully.");
    } catch (error) {
      console.error("Error processing video:", error);
      // Handle the error as needed
      message.nack();
    }
  });

  console.log("Subscribed to Pub/Sub topic:", subscriptionName);
};

subscribeToPubSub();
