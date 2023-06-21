import type { GetServerSidePropsContext } from "next";
import type { Session } from "next-auth";
import { getServerAuthSession } from "~/server/auth";

// Redirects to the path built by buldRedirectUrl
// Optionally fire a callback that runs before redirect
// Note: Since we want to avoid using getServerSideProps, the callback should be used sparingly
export async function redirectIfAuthed({
  ctx,
  buildRedirectUrl,
  callback,
  exceptionCatch, // If true, the callback will not redirect
  returnCallback,
}: {
  ctx: GetServerSidePropsContext;
  buildRedirectUrl: (session: Session) => string | undefined; // Only should be undefined if exceptionCatch is true
  callback?: () => any;
  exceptionCatch?: (session: Session) => boolean;
  returnCallback?: boolean;
}) {
  const session = await getServerAuthSession({
    req: ctx.req,
    res: ctx.res,
  });

  if (session) {
    if (exceptionCatch && exceptionCatch(session)) {
      return { props: {} };
    }

    const redirectUrl = buildRedirectUrl(session);

    if (callback) {
      callback();
    }

    return {
      redirect: {
        permanent: false,
        destination: redirectUrl,
      },
      props: {},
    };
  } else {
    if (callback) {
      if (returnCallback) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return callback();
      } else {
        callback();
      }
    }

    return { props: {} };
  }
}

export async function redirectIfNotAuthed({
  ctx,
  redirectUrl,
  callback,
}: {
  ctx: GetServerSidePropsContext;
  redirectUrl: string;
  callback?: (session?: Session) => any;
}) {
  const session = await getServerAuthSession({
    req: ctx.req,
    res: ctx.res,
  });

  if (!session) {
    if (callback) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return callback();
    }

    return {
      redirect: {
        permanent: false,
        destination: redirectUrl,
      },
      props: {},
    };
  } else {
    if (callback) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return callback(session);
    }

    return { props: { session } };
  }
}
