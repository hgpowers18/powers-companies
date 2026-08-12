/**
 * Contact form endpoint for the form in the Contact section.
 *
 * Submissions are emailed through Resend's HTTP API, so there is no mail
 * server to run and no dependency to install — the same shape as api/oauth.js.
 * The visitor's address is set as Reply-To, so answering from the inbox
 * reaches them directly.
 *
 * The page posts JSON and renders the result itself. A submission without
 * JavaScript arrives as a normal form post instead, and gets a plain HTML
 * page back, so the form still works with scripts blocked.
 *
 * Required environment variables:
 *   RESEND_API_KEY  - an API key from resend.com with send permission
 *   CONTACT_TO      - inbox that receives submissions; comma separated for more
 *                     than one
 *   CONTACT_FROM    - the From address, on a domain verified with Resend, e.g.
 *                     "Powers Companies <website@powerscompanies.com>"
 */

const HONEYPOT = "company";

// Long enough for anything a person writes, short enough that the endpoint
// cannot be used to post an essay. The inputs carry the same maxlength.
const LIMITS = { name: 120, email: 200, phone: 40, message: 4000 };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * One instance keeps its memory between invocations but there are many of
 * them and they are recycled often, so this is a speed bump for a burst from
 * one address rather than a real rate limit. The honeypot catches the rest.
 */
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const recentSubmissions = new Map();

const rateLimited = (ip) => {
  const now = Date.now();

  for (const [key, times] of recentSubmissions) {
    const live = times.filter((time) => now - time < RATE_LIMIT.windowMs);

    if (live.length) recentSubmissions.set(key, live);
    else recentSubmissions.delete(key);
  }

  const times = recentSubmissions.get(ip) ?? [];

  if (times.length >= RATE_LIMIT.max) return true;

  recentSubmissions.set(ip, [...times, now]);

  return false;
};

/**
 * Field problems are reported as codes rather than sentences: the wording
 * lives in _data/site.yml so it stays editable in the admin, and the page
 * turns each code into the message next to the field.
 */
const validate = (fields) => {
  const value = (key) => String(fields[key] ?? "").trim();
  const submission = {
    name: value("name"),
    email: value("email"),
    phone: value("phone"),
    message: value("message"),
  };

  const errors = {};

  for (const [key, limit] of Object.entries(LIMITS)) {
    if (submission[key].length > limit) errors[key] = "too_long";
  }

  if (!submission.name) errors.name = "required";
  if (!submission.email) errors.email = "required";
  else if (!EMAIL.test(submission.email)) errors.email = "invalid";

  return { submission, errors };
};

const emailBody = ({ name, email, phone, message }) =>
  [
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Phone:   ${phone || "—"}`,
    "",
    message || "(No message.)",
  ].join("\n");

/** Hand the submission to Resend. Resolves to true when it was accepted. */
const sendEmail = async (submission) => {
  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env;

  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    console.error(
      "Contact form is not configured: set RESEND_API_KEY, CONTACT_TO and CONTACT_FROM.",
    );

    return false;
  }

  let response;

  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: CONTACT_TO.split(",").map((address) => address.trim()),
        reply_to: submission.email,
        subject: `Website enquiry from ${submission.name}`,
        text: emailBody(submission),
      }),
    });
  } catch (error) {
    console.error("Contact form: could not reach Resend.", error);

    return false;
  }

  if (!response.ok) {
    console.error(`Contact form: Resend returned ${response.status}.`, await response.text());

    return false;
  }

  return true;
};

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

/**
 * Only ever seen by a visitor whose browser did not run main.js, which would
 * otherwise have posted this in the background. Self contained rather than
 * CMS-editable, because the page's own copy is not available here.
 */
const htmlResponse = (status, heading, body) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${heading}</title>
      <style>
        body { margin: 0; min-height: 100vh; display: grid; place-items: center;
               padding: 40px 20px; background: #1c1a17; color: #f3efe6;
               font-family: "Hanken Grotesk", -apple-system, sans-serif; }
        main { max-width: 520px; border: 1px solid #c19a4f; background: #252017; padding: 44px 36px; }
        h1 { font-size: 28px; font-weight: 400; margin: 0 0 12px; }
        p { font-size: 16px; line-height: 1.6; color: #bdb4a2; margin: 0 0 24px; }
        a { color: #c19a4f; }
      </style></head>
      <body><main><h1>${heading}</h1><p>${body}</p>
      <a href="/#contact">Back to the site</a></main></body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "no-store" },
    },
  );

/** Read the submission whichever way it was sent, and note how to answer. */
const readSubmission = async (request) => {
  const type = request.headers.get("content-type") ?? "";

  if (type.includes("application/json")) {
    const body = await request.json();

    if (!body || typeof body !== "object") throw new Error("Expected an object.");

    return { fields: body, wantsJSON: true };
  }

  return { fields: Object.fromEntries(await request.formData()), wantsJSON: false };
};

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("", { status: 405, headers: { Allow: "POST" } });
    }

    let fields;
    let wantsJSON;

    try {
      ({ fields, wantsJSON } = await readSubmission(request));
    } catch {
      return jsonResponse(400, { ok: false, error: "malformed" });
    }

    const fail = (status, error) =>
      wantsJSON
        ? jsonResponse(status, { ok: false, error })
        : htmlResponse(
            status,
            "That didn’t go through.",
            "Something went wrong sending your message. Please try again, " +
              "or call the office on 410-833-3700.",
          );

    const succeed = () =>
      wantsJSON
        ? jsonResponse(200, { ok: true })
        : htmlResponse(
            200,
            "Thank you.",
            "We’ve received your message and a member of the Powers team will " +
              "be in touch shortly.",
          );

    // A bot filling the hidden field gets the same answer as everyone else, so
    // it has nothing to learn from, but nothing is sent.
    if (String(fields[HONEYPOT] ?? "").trim()) return succeed();

    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();

    if (ip && rateLimited(ip)) return fail(429, "rate_limited");

    const { submission, errors } = validate(fields);

    if (Object.keys(errors).length) {
      return wantsJSON
        ? jsonResponse(400, { ok: false, error: "invalid", fields: errors })
        : htmlResponse(
            400,
            "We need a little more.",
            "Please go back and give us your name and an email address we can " +
              "reply to.",
          );
    }

    return (await sendEmail(submission)) ? succeed() : fail(502, "send_failed");
  },
};
