# Free Headkicks — freeheadkicks.com

Static storefront (plain HTML/CSS/JS) with a working Stripe Checkout,
powered by two small Netlify Functions. No database, no CMS — everything
you need to edit lives in `index.html`.

## How the checkout works

1. Customer picks a size/qty and clicks **Add to cart — Checkout**.
2. The browser calls `netlify/functions/create-checkout-session.js`.
3. That function talks to Stripe **using your secret key, which stays on
   the server** — it's never exposed in the browser — and creates a real
   Checkout Session (price, size in the line item name, shipping options,
   address collection).
4. The customer is redirected to Stripe's own hosted payment page.
5. After paying, Stripe redirects them to `success.html`.
6. `netlify/functions/stripe-webhook.js` gets notified the moment an order
   is paid, so you have a record independent of the customer's browser.

This is the standard, secure pattern — your Stripe secret key never touches
`script.js` or any file a visitor's browser can see.

## 1. Deploy to Netlify

1. Push this folder to a GitHub repo (or drag-and-drop it into Netlify's
   "Deploys" page for a manual deploy).
2. In Netlify: **Add new site → Import from Git** (or drag-and-drop).
3. Build settings are already set in `netlify.toml` — Netlify will run
   `npm install` automatically (to pull in the `stripe` package for the
   functions) and publish the site.
4. Go to **Domain settings** and add `freeheadkicks.com` as a custom
   domain, then point your DNS at Netlify (they'll show you the exact
   records — usually an A/ALIAS record for the apex domain, or a CNAME if
   you keep `www`).

## 2. Get your Stripe keys

1. Create/log into your [Stripe account](https://dashboard.stripe.com).
2. **Developers → API keys** gives you a **Publishable key** and a
   **Secret key**. You only need the **Secret key** for this setup — copy it.
3. While testing, use the keys under **"Test mode"** (toggle top-right of
   the Dashboard) — test cards like `4242 4242 4242 4242` will work and no
   real money moves. Switch to **live mode** keys only when you're ready to
   take real orders.

## 3. Add environment variables in Netlify

Site settings → **Environment variables** → add:

| Variable | Value | Required? |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` (or `sk_live_...` when live) | Yes |
| `SITE_URL` | `https://freeheadkicks.com` | Recommended — used to build the Checkout success/cancel URLs. Falls back to your Netlify deploy URL if omitted. |
| `TEE_PRICE_USD` | `23.99` | Optional — this is the default already |
| `SHIPPING_FLAT_USD` | `5.99` | Optional — flat domestic/Canada shipping rate |
| `FREE_SHIPPING_OVER_USD` | `75` | Optional — order subtotal that unlocks free shipping |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Needed once you set up the webhook (step 5) |

After adding variables, trigger a new deploy (Netlify → Deploys → Trigger
deploy) so the functions pick them up.

## 4. Test it

1. Visit your Netlify deploy URL and go through checkout with a test card:
   `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
2. You should land on `success.html`, and the order should appear in
   Stripe Dashboard → Payments (make sure you're still in **Test mode**).

## 5. Set up the webhook (so you're notified of every order)

1. In Stripe Dashboard: **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://freeheadkicks.com/.netlify/functions/stripe-webhook`
3. Select event: `checkout.session.completed`.
4. Stripe shows you a **Signing secret** (`whsec_...`) — add it to Netlify
   as `STRIPE_WEBHOOK_SECRET` (step 3 above) and redeploy.
5. Right now the function just logs the order (visible in Netlify → your
   site → Logs → Functions → stripe-webhook). Open
   `netlify/functions/stripe-webhook.js` and look for the `#TODO` — that's
   where to wire up an actual notification (email, Slack, a spreadsheet
   row) so you never miss an order. Until then, the Stripe Dashboard's
   Payments list is your order list.

## 6. Go live

1. Flip Stripe to **live mode**, copy the live secret key, and replace
   `STRIPE_SECRET_KEY` in Netlify with it.
2. Repeat the webhook setup (step 5) for live mode — test and live webhooks
   are separate.
3. Place one real order yourself to confirm everything works end to end.

## Shipping & fulfillment

Since you're shipping this yourself from existing inventory (not
print-on-demand), Stripe's built-in shipping fields are the simplest
correct setup:

- **Shipping options** — currently a flat `$5.99` domestic/Canada rate,
  with free shipping auto-unlocked over `$75`. Edit the amounts via the
  `SHIPPING_FLAT_USD` / `FREE_SHIPPING_OVER_USD` environment variables, or
  edit `netlify/functions/create-checkout-session.js` directly for more
  control (e.g. different countries, weight-based rates).
- **Address collection** — Stripe collects and validates the shipping
  address for you; it shows up in the Stripe Dashboard on the payment
  details, and in the `checkout.session.completed` webhook payload as
  `shipping_details`.
- **Size** — since size isn't a native Stripe Checkout field, it's passed
  as `metadata` on the session (and included in the line item name), so
  it's visible on the order in your Dashboard.

If you later want Stripe to calculate live carrier rates or print shipping
labels for you, that's a separate integration (e.g. Shippo or EasyPost) —
not necessary to start selling.

## Editing content

- Price, copy, and layout all live directly in `index.html`.
- Swap any photo by replacing the file in `assets/` (keep the same
  filename) or updating the `src` in `index.html`.
- Social links are in the "Follow" section near the bottom of `index.html`.
- The size chart modal's data is a plain HTML `<table>` near the bottom of
  `index.html` (search for `sizeChartOverlay`).

## Local testing (optional)

If you want to test checkout on your own machine before deploying:

```
npm install -g netlify-cli
npm install
netlify dev
```

`netlify dev` runs the site and functions together locally (usually at
`http://localhost:8888`) and reads a local `.env` file for the environment
variables above — create one with the same keys, never commit it.

## Assets

All images in `assets/` were exported from your uploaded logos and product
photos, resized and compressed for web use, plus a scalable vector logo
(`logo-vector.svg`) for the nav and footer.
