/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-misused-promises */
import router, { useRouter } from "next/router";
import YText from "~/components/YText";
import PageLayout from "~/components/layouts";
import styles from "@/styles/pages/account.module.scss";
import YButton from "~/components/YButton";
import { api } from "~/utils/api";
import { useSession } from "next-auth/react";
import { GetServerSidePropsContext } from "next";
import { redirectIfNotAuthed } from "~/utils/routing";
import Head from "next/head";
import YInput from "~/components/YInput";

const PricingWidget = ({ hasSubscription }: { hasSubscription: boolean }) => {
  const createStripeCustomerAndPortal =
    api.stripe.createBillingPortal.useMutation();

  const onUpgradeClick = async () => {
    const res = await createStripeCustomerAndPortal.mutateAsync();
    void router.push(res.billingUrl as string);
  };

  return (
    <div style={{ width: "fit-contents" }}>
      <div className={styles.Card}>
        <YText fontType="h3" className={styles.CardHeader}>
          Upgrade your account
        </YText>
        <div className={styles.CardContent}>
          <div className={styles.PricingCard}>
            <YText className={styles.PricingHeader}>Premium</YText>
            <div style={{ display: "flex", flexDirection: "row", gap: "4px" }}>
              <YText className={styles.PricingAmount}>$15</YText>
              <YText className={styles.PricingUnits}>per month</YText>
            </div>
            <YButton
              label="Subscribe"
              className={styles.SubscribeButton}
              onClick={onUpgradeClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountPage = () => {
  const { data: sessionData } = useSession();
  const { data: stripeCustomerData } =
    api.stripe.getUserSubscriptionStatus.useQuery();
  const router = useRouter();

  const isStripeCustomer = stripeCustomerData?.stripeCustomer !== null;
  const hasStripeSubscription =
    (stripeCustomerData?.stripeCustomer?.StripeSubscriptions &&
      stripeCustomerData?.stripeCustomer?.StripeSubscriptions?.length > 0 &&
      stripeCustomerData?.stripeCustomer?.StripeSubscriptions[0]?.status ===
        "active") ??
    false;

  console.log({ isStripeCustomer, hasStripeSubscription });

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
      <div className={styles.AccountListPage}>
        <div className={styles.Card}>
          <YText fontType="h3" className={styles.CardHeader}>
            Email
          </YText>
          <div className={styles.CardContent}>
            <YInput
              value={sessionData?.user?.email as string}
              setValue={() => {
                //
              }}
              showSearchIcon={false}
              disabled
            />
          </div>
        </div>
        <PricingWidget hasSubscription={hasStripeSubscription} />
      </div>
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
