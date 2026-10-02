/**
 * Public site key for the contact-form captcha. The matching secret stays in
 * TURNSTILE_SECRET_KEY and is only read by api/contact.js. Both come from the
 * host's environment, so the key is baked in at build time and a change needs
 * a redeploy before the widget appears.
 */
export default {
  siteKey: process.env.TURNSTILE_SITE_KEY || "",
};
