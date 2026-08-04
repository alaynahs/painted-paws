import Stripe from "stripe";

// .trim() guards against a stray trailing space/newline getting pasted in
// alongside the key (e.g. from a dashboard's "select" instead of "copy"
// button) — untrimmed, that whitespace breaks the HTTP headers Stripe's
// SDK builds, causing every request to fail before it even reaches Stripe.
const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

export const stripe = secretKey ? new Stripe(secretKey) : null;
