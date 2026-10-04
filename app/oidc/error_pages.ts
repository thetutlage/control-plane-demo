/**
 * What a member reads when a sign-in cannot continue, on either error page
 * of an issuer host: `errors/oidc` (Inertia, for everything outside `/oauth`) and
 * `errors/oidc.edge` (Edge, for oidc-provider's own endpoints). `code` is the
 * OAuth error code, shown small for whoever helps them; oidc-provider's
 * descriptions are written for developers and go to the logs instead.
 */
const PAGES = {
  expired: {
    title: 'This sign-in has expired',
    message:
      'Go back to the app and sign in again. Sign-ins expire after a while, and only work in the browser they were started in.',
  },
  not_found: {
    title: "This sign-in link isn't valid",
    message: 'Go back to the app and start signing in from there.',
  },
  rejected: {
    title: "We couldn't sign you in",
    message:
      "The app sent a sign-in request this page can't accept. Go back to the app and try again, or contact its owner if this keeps happening.",
  },
  server_error: {
    title: 'Something went wrong on our side',
    message: "Try again in a moment. If it keeps happening, contact the app's owner.",
  },
}

export function errorPage(kind: keyof typeof PAGES, code: string) {
  return { ...PAGES[kind], code }
}
