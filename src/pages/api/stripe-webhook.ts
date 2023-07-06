/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
import { prisma } from "../../server/db";
import { buffer } from "micro";
import {
  handleInvoicePaid,
  handleSubscriptionCanceled,
  handleSubscriptionCreatedOrUpdated,
} from "../../server/stripe/stripe-webhook-handlers";
import { stripe } from "../../server/stripe/client";

// Stripe requires the raw body to construct the event.
export const config = {
  api: {
    bodyParser: false,
  },
};

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"];

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig as string, webhookSecret);

      // Handle the event
      switch (event.type) {
        case "customer.subscription.created":
          // Used to provision services as they are added to a subscription.
          await handleSubscriptionCreatedOrUpdated({
            event,
            prisma,
          });
          break;
        case "customer.subscription.updated":
          // Used to provision services as they are updated.
          await handleSubscriptionCreatedOrUpdated({
            event,
            prisma,
          });
          break;
        case "customer.subscription.deleted":
          // handle subscription cancelled automatically based
          // upon your subscription settings.
          await handleSubscriptionCanceled({
            event,
            prisma,
          });
          break;
        case "invoice.paid":
          // Used to provision services after the trial has ended.
          // The status of the invoice will show up as paid. Store the status in your database to reference when a user accesses your service to avoid hitting rate limits.
          await handleInvoicePaid({
            event,
            prisma,
          });
          break;
        case "invoice.payment_failed":
          // This is handleded by stripe- they will get an email saying their payment failed
          break;
        case "customer.subscription.trial_will_end":
          // This is handled by stripe- they will get an email saying their trial is ending
          break;
        default:
        // Unexpected event type
      }

      // record the event in the database
      await prisma.stripeEvent.create({
        data: {
          id: event.id,
          type: event.type,
          object: event.object,
          api_version: event.api_version,
          account: event.account,
          created: new Date(event.created * 1000), // convert to milliseconds
          data: {
            object: event.data.object,
            previous_attributes: event.data.previous_attributes,
          },
          livemode: event.livemode,
          pending_webhooks: event.pending_webhooks,
          request: {
            id: event.request?.id,
            idempotency_key: event.request?.idempotency_key,
          },
        },
      });

      res.json({ received: true });
    } catch (err) {
      res.status(400).send(err);
      return;
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}
