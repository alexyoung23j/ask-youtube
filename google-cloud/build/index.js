"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTranscription = void 0;
const pubsub_1 = require("@google-cloud/pubsub");
const pubsub = new pubsub_1.PubSub();
const subscriptionName = "transcription-subscription";
const getTranscription = async (message, context) => {
    // Process the message received from Pub/Sub
    const videoUrl = JSON.parse(message.data.toString()).url;
    console.log("Processing video:", videoUrl);
    // Do the video processing
    await new Promise((resolve) => setTimeout(resolve, 5000));
    // Acknowledge the message
    message.ack();
};
exports.getTranscription = getTranscription;
const subscribeToPubSub = () => {
    const subscription = pubsub.subscription(subscriptionName);
    subscription.on("message", async (message) => {
        try {
            await (0, exports.getTranscription)(message, {});
            console.log("Video processed successfully.");
        }
        catch (error) {
            console.error("Error processing video:", error);
            // Handle the error as needed
            message.nack();
        }
    });
    console.log("Subscribed to Pub/Sub topic:", subscriptionName);
};
subscribeToPubSub();
