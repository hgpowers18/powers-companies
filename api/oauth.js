/**
 * GitHub OAuth broker for the CMS at /admin.
 *
 * Adapted from Sveltia's Cloudflare Worker authenticator
 * (https://github.com/sveltia/sveltia-cms-auth) so it runs as a Vercel
 * function on this site instead of a separate service. The CMS runs entirely
 * in the browser and cannot hold the OAuth client secret, so this endpoint
 * performs the code-for-token exchange server side.
 *
 * One endpoint serves both legs of the flow: GitHub sends the visitor back
 * with a `code`, which is what distinguishes the callback from the start.
 *
 * Required environment variables:
 *   GITHUB_CLIENT_ID      - from the GitHub OAuth app
 *   GITHUB_CLIENT_SECRET  - from the GitHub OAuth app
 * Optional:
 *   GITHUB_OAUTH_SCOPE    - defaults to public_repo; use `repo` if this
 *                           repository is ever made private
 *   ALLOWED_DOMAINS       - comma separated, wildcards allowed; defaults to
 *                           the host serving this endpoint
 */

const PROVIDER = "github";
const CSRF_COOKIE = "csrf-token";

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Respond with the page that hands the result back to the CMS window that
 * opened this one. The message format is what Sveltia and Decap listen for.
 */
const outputHTML = ({ token, error, errorCode }) => {
  const state = error ? "error" : "success";
  const payload = error ? { provider: PROVIDER, error, errorCode } : { provider: PROVIDER, token };

  return new Response(
    `<!doctype html><html><body><script>
        (() => {
          window.addEventListener('message', ({ data, origin }) => {
            if (data === 'authorizing:${PROVIDER}') {
              window.opener?.postMessage(
                'authorization:${PROVIDER}:${state}:${JSON.stringify(payload)}',
                origin
              );
            }
          });
          window.opener?.postMessage('authorizing:${PROVIDER}', '*');
        })();
      </script></body></html>`,
    {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "no-store",
        "Set-Cookie": `${CSRF_COOKIE}=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure`,
      },
    },
  );
};

const readCsrfCookie = (request) =>
  request.headers.get("cookie")?.match(/\bcsrf-token=([0-9a-f]{32})\b/)?.[1];

/** First leg: send the visitor to GitHub to sign in. */
const startAuth = (request, url) => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_OAUTH_SCOPE, ALLOWED_DOMAINS } =
    process.env;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return outputHTML({
      error: "OAuth app client ID or secret is not configured.",
      errorCode: "MISCONFIGURED_CLIENT",
    });
  }

  const provider = url.searchParams.get("provider");

  if (provider && provider !== PROVIDER) {
    return outputHTML({
      error: "Your Git backend is not supported by the authenticator.",
      errorCode: "UNSUPPORTED_BACKEND",
    });
  }

  // Only allow the CMS on this site (or an explicitly listed host) to use this
  // endpoint, so it cannot be borrowed by another origin.
  const requester = url.searchParams.get("site_id") ?? request.headers.get("host") ?? "";
  const allowed = (ALLOWED_DOMAINS ?? request.headers.get("host") ?? "").split(",");

  if (
    !allowed.some((entry) =>
      requester.match(new RegExp(`^${escapeRegExp(entry.trim()).replace("\\*", ".+")}$`)),
    )
  ) {
    return outputHTML({
      error: "Your domain is not allowed to use the authenticator.",
      errorCode: "UNSUPPORTED_DOMAIN",
    });
  }

  const csrfToken = globalThis.crypto.randomUUID().replaceAll("-", "");

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    // public_repo is enough to commit to a public repository and, unlike
    // `repo`, gives the CMS no access to private ones.
    scope: GITHUB_OAUTH_SCOPE || "public_repo",
    state: csrfToken,
  });

  return new Response("", {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      "Cache-Control": "no-store",
      // Lax so the browser still sends it when GitHub redirects back.
      "Set-Cookie":
        `${CSRF_COOKIE}=${csrfToken}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
    },
  });
};

/** Second leg: swap the code GitHub sent us for an access token. */
const handleCallback = async (request, url) => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return outputHTML({
      error: "OAuth app client ID or secret is not configured.",
      errorCode: "MISCONFIGURED_CLIENT",
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const csrfToken = readCsrfCookie(request);

  if (!code || !state) {
    return outputHTML({
      error: "Failed to receive an authorization code. Please try again later.",
      errorCode: "AUTH_CODE_REQUEST_FAILED",
    });
  }

  if (!csrfToken || state !== csrfToken) {
    return outputHTML({
      error: "Potential CSRF attack detected. Authentication flow aborted.",
      errorCode: "CSRF_DETECTED",
    });
  }

  let response;

  try {
    response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
      }),
    });
  } catch {
    return outputHTML({
      error: "Failed to request an access token. Please try again later.",
      errorCode: "TOKEN_REQUEST_FAILED",
    });
  }

  try {
    const { access_token: token, error } = await response.json();

    return outputHTML({ token, error });
  } catch {
    return outputHTML({
      error: "Server responded with malformed data. Please try again later.",
      errorCode: "MALFORMED_RESPONSE",
    });
  }
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method !== "GET") {
      return new Response("", { status: 405 });
    }

    return url.searchParams.has("code") ? handleCallback(request, url) : startAuth(request, url);
  },
};
