// netlify/functions/stripe-webhook.js
//
// Listens for Stripe's checkout.session.completed event so you know the
// instant an order comes in — this is what tells you "go pack and ship this."
//
// Required Netlify environment variables:
//   STRIPE_SECRET_KEY      — same key used in create-checkout-session.js
//   STRIPE_WEBHOOK_SECRET  — printed to your terminal by `stripe listen`
//                            while testing, or shown on the Dashboard when
//                            you register this URL as a live webhook endpoint
//                            (Developers → Webhooks → Add endpoint)
//
// This function currently just logs the paid order (visible in Netlify's
// function logs) — see the "WIRE THIS UP" note below for where to send
// yourself an actual notification (email, Slack, a spreadsheet row, etc).

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
});

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    const order = {
      email: session.customer_details?.email,
      name: session.customer_details?.name,
      shippingAddress: session.shipping_details?.address,
      size: session.metadata?.size,
      quantity: session.metadata?.quantity,
      amountTotal: (session.amount_total / 100).toFixed(2),
      sessionId: session.id,
    };

    console.log('New Free Headkicks order:', order);

    // #TODO — WIRE THIS UP: send yourself a real notification so you catch
    // every order. A few common options:
    //   - Email via Resend/SendGrid/Postmark (needs their API + an env var)
    //   - Slack via an Incoming Webhook URL (one fetch() call, no SDK needed)
    //   - Append a row to a Google Sheet via a Sheets API service account
    // Until one of those is wired up, keep an eye on:
    //   Netlify → your site → Logs → Functions → stripe-webhook
    // and the Stripe Dashboard's Payments list, which shows every order too.
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
