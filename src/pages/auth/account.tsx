/* eslint-disable @typescript-eslint/no-misused-promises */
import router from "next/router";
import YText from "~/components/YText";
import PageLayout from "~/components/layouts";
import styles from "@/styles/pages/chats.module.scss";
import YButton from "~/components/YButton";
import { api } from "~/utils/api";
import { useSession } from "next-auth/react";
import { GetServerSidePropsContext } from "next";
import { redirectIfNotAuthed } from "~/utils/routing";

const AccountPage = () => {
  const { data: stripeCustomerData } =
    api.stripe.getUserSubscriptionStatus.useQuery();

  console.log({ stripeCustomerData });

  const createStripeCustomerAndPortal =
    api.stripe.createBillingPortal.useMutation();

  const isStripeCustomer = stripeCustomerData?.stripeCustomer !== null;
  const hasStripeSubscription =
    stripeCustomerData?.stripeCustomer?.StripeSubscriptions &&
    stripeCustomerData?.stripeCustomer?.StripeSubscriptions?.length > 0;

  const onUpgradeClick = async () => {
    const res = await createStripeCustomerAndPortal.mutateAsync();
    console.log({ res });
    window.open(res.billingUrl as string, "_blank");
  };

  return (
    <PageLayout
      rightContent={
        <div className={styles.TopNavBar}>
          <YText
            fontType="h3"
            className={styles.Text}
            onClick={() => {
              void router.push("/videos");
            }}
          >
            📼 Videos
          </YText>
          <YText
            fontType="h3"
            className={styles.Text}
            onClick={() => {
              void router.push("/chats");
            }}
          >
            💬 Chats
          </YText>
          <YText
            fontType="h3"
            className={styles.Text}
            onClick={() => {
              void router.push("/auth/account");
            }}
          >
            Account
          </YText>
        </div>
      }
    >
      <YButton label="Upgrade" onClick={onUpgradeClick} />
    </PageLayout>
  );
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  // Redirect to Landing Page if Not Logged in
  return redirectIfNotAuthed({
    ctx,
    redirectUrl: "/auth/sign-in",
  });
}

export default AccountPage;
