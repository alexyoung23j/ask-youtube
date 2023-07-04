import {
  PrismaClient,
  StripeInvoiceStatus,
  StripeSubscriptionLevel,
} from "@prisma/client";
import type Stripe from "stripe";

export const handleInvoicePaid = async ({
  event,
  prisma,
}: {
  event: Stripe.Event;
  prisma: PrismaClient;
}) => {
  // Update or create an invoice object
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoice.subscription;

  if (
    invoice.amount_paid === 0 &&
    invoice.billing_reason === "subscription_create"
  ) {
    // This is the first (empty) invoice of a subscription, ignore the updates
    // because it causes a weird race condition since the subscription hasnt been created
    return;
  }

  let stripeSubscription;
  try {
    stripeSubscription = await prisma.stripeSubscription.findFirst({
      where: {
        id: subscriptionId as string,
      },
    });

    if (!stripeSubscription) {
      // Both checks needed to handle first invoice of 0
      setTimeout(() => {
        // Wait for subscription to be created: TODO: fix this hack
      }, 1500);

      stripeSubscription = await prisma.stripeSubscription.findFirst({
        where: {
          id: subscriptionId as string,
        },
      });

      if (!stripeSubscription) {
        throw new Error("Stripe subscription not found");
      }
    }

    let stripeInvoice;
    stripeInvoice = await prisma.stripeInvoice.findFirst({
      where: {
        id: invoice.id,
      },
    });

    if (!stripeInvoice) {
      stripeInvoice = await prisma.stripeInvoice.create({
        data: {
          id: invoice.id,
          amountPaid: invoice.amount_paid,
          stripeCustomerId: invoice.customer as string,
          stripeSubscriptionId: subscriptionId as string,
          status: invoice.status as StripeInvoiceStatus,
        },
      });
    } else {
      stripeInvoice = await prisma.stripeInvoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          amountPaid: invoice.amount_paid,
          status: invoice.status as StripeInvoiceStatus,
        },
      });
    }
  } catch (e) {
    console.log(e);
  }
};

export const handleSubscriptionCreatedOrUpdated = async ({
  event,
  prisma,
}: {
  event: Stripe.Event;
  prisma: PrismaClient;
}) => {
  // This should only be fired when a subscription is updated
  const subscription = event.data.object as Stripe.Subscription;

  try {
    await prisma.$transaction(async (prisma) => {
      let stripeSubscription;
      stripeSubscription = await prisma.stripeSubscription.findFirst({
        where: {
          id: subscription.id,
        },
      });

      if (!stripeSubscription) {
        // Create the subscription object
        stripeSubscription = await prisma.stripeSubscription.create({
          data: {
            id: subscription.id,
            stripeCustomerId: subscription.customer as string,
            status: subscription.status,
            subscriptionItemId: subscription.items?.data[0]?.id ?? "",
            subscriptionLevel: StripeSubscriptionLevel.pro,
          },
        });
      } else {
        stripeSubscription = await prisma.stripeSubscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            status: subscription.status,
            subscriptionItemId: subscription.items?.data[0]?.id ?? "",
            subscriptionLevel: StripeSubscriptionLevel.pro,
          },
        });
      }

      if (!stripeSubscription) {
        throw new Error("Stripe subscription not found");
      }
    });
  } catch (e) {
    console.error(e);
  }
};

export const handleSubscriptionCanceled = async ({
  event,
  prisma,
}: {
  event: Stripe.Event;
  prisma: PrismaClient;
}) => {
  const subscription = event.data.object as Stripe.Subscription;

  // Update the status
  try {
    await prisma.stripeSubscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        status: subscription.status,
      },
    });
  } catch (e) {
    console.error(e);
  }
};
